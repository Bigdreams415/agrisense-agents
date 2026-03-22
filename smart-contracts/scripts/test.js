const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
const privateKey = '0xdef900d1666cc67f1e5cf4bbeb799538d683d6e0263db150896ceb850e0f6f8a'; // Raw private key
const wallet = new ethers.Wallet(privateKey, provider);

async function test() {
  try {
    console.log('Wallet Address:', wallet.address);
    console.log('Provider Network:', await provider.getNetwork());
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance (wei):', balance.toString());
    console.log('Balance (HBAR):', ethers.formatUnits(balance, 18)); // Hedera EVM uses wei (10^18)

    const hbarAmount = '2'; // 2 HBAR
    const valueInWei = ethers.parseUnits(hbarAmount, 18); // 2 HBAR = 2 * 10^18 wei
    console.log('Transaction Value (wei):', valueInWei.toString());
    console.log('Transaction Value (HBAR):', ethers.formatUnits(valueInWei, 18));

    const tx = await wallet.sendTransaction({
      to: '0x00000000000000000000000000000000006939b1',
      value: valueInWei,
      gasLimit: 50000,
      data: '0x'
    });
    console.log('Tx Hash:', tx.hash);
    console.log('Transaction:', tx);
    const receipt = await tx.wait();
    console.log('Receipt:', receipt);
  } catch (error) {
    console.error('Error:', error);
    if (error.reason) console.error('Reason:', error.reason);
    if (error.data) console.error('Data:', error.data);
    if (error.error) console.error('Error Details:', error.error);
  }
}

async function runWithRetry() {
  let attempts = 3;
  while (attempts > 0) {
    try {
      await test();
      return;
    } catch (error) {
      console.error(`Attempt ${4 - attempts} failed:`, error);
      attempts--;
      if (attempts > 0) {
        console.log(`Retrying in 5 seconds... (${attempts} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  console.error('All attempts failed.');
}

runWithRetry();