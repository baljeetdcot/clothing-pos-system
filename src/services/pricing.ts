import { CartItem, PricingRule, DiscountTier } from '../types';

export class PricingService {
  private static missingRulesLogged = new Set<string>();
  
  static pricingRules: PricingRule[] = [
    { category: 'Denim', single_price: 999, bundle_price: 2499, bundle_quantity: 3 },
    { category: 'T-shirt', single_price: 499, bundle_price: 1199, bundle_quantity: 3 },
    { category: 'Shirt', single_price: 699, bundle_price: 1699, bundle_quantity: 3 },
    { category: 'Trouser-Formal', single_price: 699, bundle_price: 1699, bundle_quantity: 3 },
    { category: 'Trouser-Casual', single_price: 849, bundle_price: 2199, bundle_quantity: 3 },
    { category: 'TRUNK', single_price: 599, bundle_price: 1499, bundle_quantity: 3 }
  ];

  private static discountTiers: DiscountTier[] = [
    { min_amount: 7000, discount_amount: 750 },
    { min_amount: 5000, discount_amount: 500 },
    { min_amount: 3000, discount_amount: 250 }
  ];

  static calculateItemPrice(item: CartItem, allCartItems: CartItem[] = [], customerOffers: any[] = [], applyTierDiscount: boolean = false, tierDiscountAmount: number = 0, subtotal: number = 0): number {
    // Determine pricing category based on sub_section_name and category
    let pricingCategory = item.item.sub_section_name;
    
    // Special handling for Trouser - use category to determine Formal vs Casual
    if (item.item.sub_section_name.toLowerCase() === 'trouser') {
      if (item.item.category.toLowerCase() === 'formal') {
        pricingCategory = 'Trouser-Formal';
      } else {
        pricingCategory = 'Trouser-Casual';
      }
    }

    // Find matching rule (case-insensitive)
    const rule = this.pricingRules.find(r => 
      r.category.toLowerCase() === pricingCategory.toLowerCase()
    );
    
    if (!rule) {
      // Only log once per unique category to reduce spam
      const logKey = `${pricingCategory}-${item.item.sub_section_name}-${item.item.category}`;
      if (!PricingService.missingRulesLogged.has(logKey)) {
        console.log(`No pricing rule found for: ${pricingCategory} (sub_section: ${item.item.sub_section_name}, category: ${item.item.category})`);
        PricingService.missingRulesLogged.add(logKey);
      }
      let basePrice = item.unit_price * item.quantity;
      
      // Apply proportional tier discount if requested
      if (applyTierDiscount && subtotal > 0) {
        const itemProportion = basePrice / subtotal;
        const itemDiscount = tierDiscountAmount * itemProportion;
        basePrice -= itemDiscount;
      }
      
      return basePrice;
    }

    // If manual override, use the override price
    if (item.manual_override) {
      let basePrice = item.unit_price * item.quantity;
      
      // Apply proportional tier discount if requested
      if (applyTierDiscount && subtotal > 0) {
        const itemProportion = basePrice / subtotal;
        const itemDiscount = tierDiscountAmount * itemProportion;
        basePrice -= itemDiscount;
      }
      
      return basePrice;
    }

    // Calculate current cart quantity of items with the same pricing category
    const currentCartQuantity = allCartItems
      .filter(cartItem => {
        let itemPricingCategory = cartItem.item.sub_section_name;
        if (cartItem.item.sub_section_name.toLowerCase() === 'trouser') {
          if (cartItem.item.category.toLowerCase() === 'formal') {
            itemPricingCategory = 'Trouser-Formal';
          } else {
            itemPricingCategory = 'Trouser-Casual';
          }
        }
        return itemPricingCategory.toLowerCase() === pricingCategory.toLowerCase();
      })
      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);

    let basePrice: number;

    // Calculate pricing with proper bundle logic
    // If total cart quantity >= bundle quantity, apply bundle pricing to the first N items
    // and single pricing to the remaining items
    if (currentCartQuantity >= rule.bundle_quantity) {
      // Calculate how many complete bundles we can make
      const completeBundles = Math.floor(currentCartQuantity / rule.bundle_quantity);
      const remainingItems = currentCartQuantity % rule.bundle_quantity;
      
      // Calculate how many items in this specific cart item get bundle pricing
      let bundleItemsInThisItem = 0;
      let singleItemsInThisItem = item.quantity;
      
      // Count items before this one in the cart
      let itemsBeforeThis = 0;
      for (const cartItem of allCartItems) {
        if (cartItem === item) break; // Stop when we reach the current item
        
        let itemPricingCategory = cartItem.item.sub_section_name;
        if (cartItem.item.sub_section_name.toLowerCase() === 'trouser') {
          if (cartItem.item.category.toLowerCase() === 'formal') {
            itemPricingCategory = 'Trouser-Formal';
          } else {
            itemPricingCategory = 'Trouser-Casual';
          }
        }
        
        if (itemPricingCategory.toLowerCase() === pricingCategory.toLowerCase()) {
          itemsBeforeThis += cartItem.quantity;
        }
      }
      
      // Calculate how many items in this cart item should get bundle pricing
      const totalBundleItems = completeBundles * rule.bundle_quantity;
      const bundleItemsAvailable = Math.max(0, totalBundleItems - itemsBeforeThis);
      bundleItemsInThisItem = Math.min(bundleItemsAvailable, item.quantity);
      singleItemsInThisItem = item.quantity - bundleItemsInThisItem;
      
      // Calculate price: bundle items get bundle unit price, single items get single price
      const bundleUnitPrice = rule.bundle_price / rule.bundle_quantity;
      basePrice = (bundleItemsInThisItem * bundleUnitPrice) + (singleItemsInThisItem * rule.single_price);
    } else {
      // Apply single pricing
      basePrice = item.quantity * rule.single_price;
    }

    // Apply proportional tier discount if requested
    if (applyTierDiscount && subtotal > 0) {
      const itemProportion = basePrice / subtotal;
      const itemDiscount = tierDiscountAmount * itemProportion;
      basePrice -= itemDiscount;
    }

    return basePrice;
  }

  static calculateCartTotal(cartItems: CartItem[], customerOffers: any[] = [], applyTierDiscountToItems: boolean = false, oneTimeDiscount: number = 0): {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    discountBreakdown: { tier: string; amount: number }[];
  } {
    // Group items by category for bundle pricing
    const categoryGroups: { [key: string]: CartItem[] } = {};
    cartItems.forEach(item => {
      if (!categoryGroups[item.item.category]) {
        categoryGroups[item.item.category] = [];
      }
      categoryGroups[item.item.category].push(item);
    });

    let subtotal = 0;
    const discountBreakdown: { tier: string; amount: number }[] = [];

    // Calculate subtotal with bundle pricing (without tier discount)
    cartItems.forEach(item => {
      subtotal += this.calculateItemPrice(item, cartItems, customerOffers, false, 0, 0);
    });

    // Apply customer offers - all offers are lifetime valid and give flat percentage discount
    let customerDiscountPercentage = 0;
    const validOffers = customerOffers.filter(offer => {
      const now = new Date();
      const validFrom = new Date(offer.valid_from);
      return now >= validFrom; // Only check valid_from, ignore valid_until for lifetime offers
    });

    if (validOffers.length > 0) {
      // Find the best customer offer (highest percentage)
      for (const offer of validOffers) {
        if (offer.discount_percentage > customerDiscountPercentage) {
          customerDiscountPercentage = offer.discount_percentage;
        }
      }
    }

    // Apply standard discount tiers first
    let standardDiscount = 0;
    for (const tier of this.discountTiers) {
      if (subtotal >= tier.min_amount) {
        standardDiscount = tier.discount_amount;
        break;
      }
    }

    // Apply tier discount first
    const amountAfterTierDiscount = subtotal - standardDiscount;
    
    // Apply one-time discount on the amount after tier discount
    const amountAfterOneTimeDiscount = amountAfterTierDiscount - oneTimeDiscount;
    
    // Apply customer percentage discount on the amount after both tier and one-time discounts
    let customerDiscountAmount = 0;
    if (customerDiscountPercentage > 0) {
      customerDiscountAmount = (amountAfterOneTimeDiscount * customerDiscountPercentage) / 100;
    }
    
    // Total discount is tier discount + one-time discount + customer percentage discount
    const totalDiscount = standardDiscount + oneTimeDiscount + customerDiscountAmount;
    
    // Add discount breakdown
    if (standardDiscount > 0) {
      const tier = this.discountTiers.find(t => t.discount_amount === standardDiscount);
      if (tier) {
        discountBreakdown.push({
          tier: `Rs${tier.min_amount}+ (Rs${tier.discount_amount} off)`,
          amount: standardDiscount
        });
      }
    }
    
    if (oneTimeDiscount > 0) {
      discountBreakdown.push({
        tier: `One-time Discount`,
        amount: oneTimeDiscount
      });
    }
    
    if (customerDiscountAmount > 0) {
      discountBreakdown.push({
        tier: `Customer Offer (${customerDiscountPercentage}% off)`,
        amount: customerDiscountAmount
      });
    }

    // If we need to apply tier discount to individual items, recalculate subtotal
    if (applyTierDiscountToItems && totalDiscount > 0) {
      const originalSubtotal = subtotal;
      subtotal = 0;
      cartItems.forEach(item => {
        subtotal += this.calculateItemPrice(item, cartItems, customerOffers, true, totalDiscount, originalSubtotal);
      });
    }

    const afterDiscount = subtotal - (applyTierDiscountToItems ? 0 : totalDiscount);
    // Since prices are inclusive of 5% GST, we need to calculate the tax component
    // If price is inclusive of 5% GST, then: price = base_price * 1.05
    // So base_price = price / 1.05, and tax = price - base_price
    const baseAmount = afterDiscount / 1.05; // Remove 5% GST to get base amount
    const tax = afterDiscount - baseAmount; // Calculate 5% GST component
    const total = afterDiscount; // Total is already inclusive of GST

    return {
      subtotal,
      discount: totalDiscount,
      tax,
      total,
      discountBreakdown
    };
  }

  static getPricingRules(): PricingRule[] {
    return [...this.pricingRules];
  }

  static updatePricingRule(category: string, rule: Partial<PricingRule>): void {
    const index = this.pricingRules.findIndex(r => r.category === category);
    if (index >= 0) {
      this.pricingRules[index] = { ...this.pricingRules[index], ...rule };
    } else {
      this.pricingRules.push(rule as PricingRule);
    }
  }

  static getDiscountTiers(): DiscountTier[] {
    return [...this.discountTiers];
  }

  static updateDiscountTier(minAmount: number, discountAmount: number): void {
    const index = this.discountTiers.findIndex(t => t.min_amount === minAmount);
    if (index >= 0) {
      this.discountTiers[index].discount_amount = discountAmount;
    } else {
      this.discountTiers.push({ min_amount: minAmount, discount_amount: discountAmount });
      // Sort by min_amount descending
      this.discountTiers.sort((a, b) => b.min_amount - a.min_amount);
    }
  }
}
