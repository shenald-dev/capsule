// Example demonstrating Capsule timeout handling:
// Run with: node dist/cli.js run node examples/failing-timeout.js --timeout 1000
console.log('Task started... will hang indefinitely.');
setInterval(() => {
  console.log('Still running...');
}, 5000);
