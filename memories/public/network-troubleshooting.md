---
privacy: public
tags: [network, troubleshooting, zebra-printer, wifi]
created: 2025-08-23
share_freely: true
---

# Network Troubleshooting - Lessons Learned

## Always Check Network First
- **First question**: "Are you on the right WiFi?"
- **Command to check**: `ifconfig | grep -A1 'inet ' | grep -v 127.0.0.1`
- **Common mistake**: Being connected to wrong WiFi network when troubleshooting devices

## Igor's Network Setup
- Zebra printer IP: 192.168.0.146 (correct WiFi network)
- Router creates different subnets/VLANs
- Devices may appear in router but be unreachable if on wrong network segment

## Date Learned
August 23, 2025 - Zebra printer discovery session