# Worker Process Analysis

## Current Status

**Process:** `./9e87572a` (Next.js Worker)
- **PID:** 288 (main worker)
- **State:** Sleeping (S)
- **Threads:** 14
- **CPU Time:** 756.81 seconds (12.6 minutes) since container start
- **Memory:** 2.35 GB

## Active Connections

1. **External Connection:**
   - `172.18.0.3:60218` → `141.95.72.60:443` (ESTABLISHED)
   - This is likely WhatsApp API or external service

2. **File Descriptors:**
   - Socket connections (SSE clients)
   - Event poll (epoll) for async I/O
   - IO_uring for efficient I/O operations
   - Pipes for inter-process communication

## Potential CPU Usage Sources

### 1. Server-Sent Events (SSE)
- Multiple SSE connections from browser clients
- Each connection requires a worker thread
- If connections are reconnecting frequently, this causes high CPU

### 2. Polling Intervals
Found in codebase:
- `ChatArea.tsx`: Window status polling every 30 seconds
- `CustomerServiceWindowDashboard.tsx`: Update windows every 30 seconds
- `CustomerServiceWindowStatus.tsx`: Status update every 30 seconds, time remaining every 60 seconds

### 3. Database Queries
Logs show repeated queries:
- Messages API calls with pagination
- Business number filtering
- Contact lookups

### 4. Multiple Browser Tabs
- Each browser tab/window creates separate SSE connections
- Multiple tabs = multiple workers = high CPU

## Recommendations

1. **Check for multiple browser tabs/windows** - Close unused tabs
2. **Monitor SSE connection stability** - Ensure connections aren't reconnecting
3. **Review polling intervals** - Consider increasing intervals or using SSE for updates
4. **Check for infinite loops** - Verify useEffect dependencies aren't causing re-renders

## Next Steps

1. Monitor CPU usage after recent fixes
2. Check browser console for SSE reconnection errors
3. Verify only one browser tab is open
4. Consider reducing polling frequency if CPU remains high


