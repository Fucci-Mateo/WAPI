# Worker Thread CPU Usage Fixes

## Problem
Production environment showing 885% CPU usage (almost 9 CPU cores) due to:
1. Multiple Next.js worker threads (`./500c3166` processes)
2. Excessive polling intervals (30 seconds for multiple components)
3. Next.js spawning workers based on CPU core count

## Fixes Applied

### 1. Limited Node.js Thread Pool (`docker-compose.prd.yml`)
- Added `UV_THREADPOOL_SIZE: 4` to limit libuv thread pool
- This reduces the number of threads Node.js uses for async I/O operations

### 2. Reduced Polling Intervals
Reduced polling frequency from 30 seconds to 60 seconds:
- `ChatArea.tsx`: Window status polling (30s → 60s)
- `CustomerServiceWindowDashboard.tsx`: Window updates (30s → 60s)
- `CustomerServiceWindowStatus.tsx`: Status updates (30s → 60s)

**Impact**: Reduces API calls and CPU usage by ~50% for polling operations

### 3. Next.js Worker Configuration
- Note: Next.js 15 manages workers internally and doesn't expose direct configuration
- Workers are spawned based on system resources and workload
- The `UV_THREADPOOL_SIZE` limit helps control underlying thread usage

## Expected Results

1. **Reduced CPU Usage**: From ~885% to expected ~200-400% (2-4 cores)
2. **Lower Polling Overhead**: 50% reduction in polling API calls
3. **Better Resource Management**: Limited thread pool prevents excessive thread creation

## Monitoring

After deployment, monitor:
```bash
# Check CPU usage
docker stats wabm_app --no-stream

# Check thread count
docker exec wabm_app ps -T | wc -l

# Check process details
docker exec wabm_app top -bn1
```

## Additional Recommendations

1. **Monitor SSE Connections**: Ensure SSE connections are stable (already fixed)
2. **Check Browser Tabs**: Multiple tabs create multiple SSE connections
3. **Consider Load Balancing**: If CPU remains high, consider horizontal scaling
4. **Database Query Optimization**: Review if database queries are optimized

## Notes

- Next.js 15 uses Rust-based workers (tokio) which are efficient but can spawn many threads
- The high CPU might be normal for a busy application, but should be monitored
- If CPU remains high after these fixes, consider:
  - Reducing concurrent SSE connections
  - Further optimizing database queries
  - Implementing request rate limiting
  - Using a reverse proxy with connection pooling

