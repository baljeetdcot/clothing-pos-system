# POS System Network Access Guide

## Quick Setup Steps

### Step 1: Open Firewall Port
1. Run `open-firewall-port.bat` as Administrator
2. This opens port 3001 for network access

### Step 2: Get Network Information
1. Run `network-info.bat`
2. Note the IP address shown (e.g., 192.168.1.100)
3. Use this IP to access from other devices: `http://192.168.1.100:3001`

### Step 3: Test Local Access First
1. On the same PC, open browser
2. Go to `http://localhost:3001`
3. Verify the POS system loads correctly

## Network Scenarios

### Scenario 1: Same Local Network (WiFi/LAN)
- **Most Common**: Both PCs connected to same WiFi router
- **Solution**: Use the local IP address (e.g., 192.168.1.100:3001)
- **Requirements**: 
  - Windows Firewall allows port 3001
  - Both devices on same network

### Scenario 2: Different Networks
- **Issue**: PCs on different internet connections
- **Solutions**:
  1. **VPN**: Connect both PCs to same VPN
  2. **Port Forwarding**: Configure router to forward port 3001
  3. **Cloud Deployment**: Deploy to cloud service

### Scenario 3: Corporate Network
- **Issue**: Corporate firewall blocking connections
- **Solution**: Contact IT to open port 3001

## Troubleshooting

### Check if Server is Running
```bash
netstat -an | findstr ":3001"
```
Should show: `TCP 0.0.0.0:3001 0.0.0.0:0 LISTENING`

### Check Firewall Status
```bash
netsh advfirewall firewall show rule name="POS System Port 3001"
```

### Test Connectivity
From another PC, try:
```bash
telnet [SERVER_IP] 3001
```

## Security Considerations

### For Production Use
1. **Change Default Port**: Use a different port (e.g., 8080)
2. **Add Authentication**: Implement proper user authentication
3. **Use HTTPS**: Enable SSL/TLS encryption
4. **Restrict Access**: Limit to specific IP ranges

### For Development/Testing
- Current setup is fine for local testing
- Ensure only trusted devices can access

## Common Error Messages

### "This site can't be reached"
- **Cause**: Firewall blocking or wrong IP address
- **Solution**: Check firewall and IP address

### "Connection refused"
- **Cause**: Server not running or wrong port
- **Solution**: Start server and verify port

### "Timeout"
- **Cause**: Network routing issues
- **Solution**: Check network configuration

## Advanced Configuration

### Change Server Port
Edit `server.js` line 10:
```javascript
const PORT = process.env.PORT || 8080; // Change 3001 to 8080
```

### Bind to Specific IP
Edit `server.js` line 1119:
```javascript
app.listen(PORT, '192.168.1.100', () => { // Replace with your IP
```

## Support

If you continue having issues:
1. Run `network-info.bat` and share the output
2. Check Windows Firewall settings
3. Verify both PCs are on the same network
4. Try accessing from the same PC first
