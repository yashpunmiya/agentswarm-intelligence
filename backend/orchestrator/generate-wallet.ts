// generate-wallet.ts - Run once to generate orchestrator wallet
import { generateKeypair } from 'x402-stacks';

const keypair = generateKeypair('testnet');

console.log('\n🔐 Generated Orchestrator Wallet:\n');
console.log(`Private Key: ${keypair.privateKey}`);
console.log(`Address: ${keypair.address}`);
console.log(`\n📝 Add this to backend/orchestrator/.env:`);
console.log(`ORCHESTRATOR_PRIVATE_KEY=${keypair.privateKey}`);
console.log(`ORCHESTRATOR_ADDRESS=${keypair.address}`);
console.log(`\n💰 Fund this address:`);
console.log(`https://explorer.stacks.co/sandbox/faucet?chain=testnet`);
console.log(`\nAddress to fund: ${keypair.address}\n`);
