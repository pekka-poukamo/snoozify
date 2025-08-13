import './chrome-mock.js'

// Ensure a consistent default timezone for date formatting assertions if needed
process.env.TZ = 'UTC'

// Utility to sleep in tests
globalThis.wait = (ms = 0) => new Promise(res => setTimeout(res, ms))