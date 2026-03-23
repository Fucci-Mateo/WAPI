# How to Verify if fetchMessages Loop is the Problem

## Step 1: Check Query Frequency
Run this command to see how many queries per minute:
```bash
docker logs wabm_app --since 1m 2>&1 | grep "📨 Messages API" | wc -l
```

**Expected if problem exists:** 10+ queries per minute (should be 1-2 max)

## Step 2: Check fetchMessages Call Logs
The store logs when fetchMessages is called. Check frequency:
```bash
docker logs wabm_app --tail 1000 2>&1 | grep "🔍 fetchMessages called" | wc -l
```

**Expected if problem exists:** Many calls in short time

## Step 3: Check if fetchMessages is Stable
In Zustand, functions are stable by default, BUT if the component re-renders and `fetchMessages` is in the dependency array, it could cause issues.

## Step 4: Temporary Fix to Test
Remove `fetchMessages` from dependency array temporarily:
```typescript
useEffect(() => {
  if (selectedNumber) {
    fetchMessages(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedNumber]); // Remove fetchMessages from deps
```

If CPU drops after this change, the problem is confirmed.

## Step 5: Monitor CPU in Real-Time
```bash
watch -n 1 'docker exec wabm_app ps aux | grep "./9e87572a" | head -1'
```

Watch CPU% - if it drops after removing fetchMessages from deps, problem confirmed.


