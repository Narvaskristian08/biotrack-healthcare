import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import solc from 'solc';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.resolve(__dirname, '..', 'contracts', 'BioTrackMessageAnchor.sol');
const contractFileName = 'BioTrackMessageAnchor.sol';
const contractName = 'BioTrackMessageAnchor';
const GWEI = 1_000_000_000n;

function compileContract(source) {
  const input = {
    language: 'Solidity',
    sources: {
      [contractFileName]: {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((item) => item.severity === 'error');
  if (errors.length > 0) {
    const details = errors.map((item) => item.formattedMessage).join('\n');
    throw new Error(`Solidity compilation failed:\n${details}`);
  }

  const compiled = output.contracts?.[contractFileName]?.[contractName];
  if (!compiled?.abi || !compiled?.evm?.bytecode?.object) {
    throw new Error('Compiled contract output is incomplete.');
  }

  return {
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`,
  };
}

function formatEth(wei) {
  return Number(ethers.formatEther(wei));
}

function formatUsd(wei, ethUsd) {
  return formatEth(wei) * ethUsd;
}

function messageOfLength(length) {
  return 'm'.repeat(length);
}

async function main() {
  const source = readFileSync(contractPath, 'utf8');
  const { abi, bytecode } = compileContract(source);

  const ganacheProvider = ganache.provider({
    logging: { quiet: true },
    chain: { chainId: 1337 },
  });
  const provider = new ethers.BrowserProvider(ganacheProvider);
  const signer = await provider.getSigner();

  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployReceipt = await contract.deploymentTransaction().wait();
  const deploymentGas = deployReceipt.gasUsed;

  const testCases = [
    { id: 'case-1', label: 'Short message', message: 'OK' },
    { id: 'case-2', label: '64-byte message', message: messageOfLength(64) },
    { id: 'case-3', label: 'Max 280-byte message', message: messageOfLength(280) },
  ];

  const gasPriceScenarios = [1n, 5n, 20n];
  const ethUsd = Number(process.env.ETH_USD ?? '3500');

  const results = [];
  for (const testCase of testCases) {
    const tx = await contract.setMessage(testCase.message);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.gasPrice ?? 0n;
    const txCostWei = gasUsed * effectiveGasPrice;

    const scenarioCosts = gasPriceScenarios.map((gwei) => {
      const costWei = gasUsed * gwei * GWEI;
      return {
        gwei,
        costWei,
        costEth: formatEth(costWei),
        costUsd: formatUsd(costWei, ethUsd),
      };
    });

    results.push({
      ...testCase,
      gasUsed,
      effectiveGasPrice,
      txCostWei,
      scenarioCosts,
    });
  }

  console.log('BioTrackMessageAnchor gas benchmark');
  console.log(`Contract: ${contractPath}`);
  console.log(`Deployment gas: ${deploymentGas.toString()}`);
  console.log(`ETH/USD assumption for USD display: ${ethUsd}`);
  console.log('');

  console.log('Measured transaction data (Ganache local run):');
  console.log('Case | Message bytes | Gas used | Effective gas price (gwei) | Tx cost (ETH)');
  for (const row of results) {
    const gasPriceGwei = Number(row.effectiveGasPrice) / Number(GWEI);
    console.log(
      `${row.id} | ${Buffer.byteLength(row.message, 'utf8')} | ${row.gasUsed.toString()} | ${gasPriceGwei.toFixed(3)} | ${formatEth(row.txCostWei).toFixed(8)}`
    );
  }

  console.log('');
  console.log('Estimated wallet cost by gas-price scenario:');
  for (const row of results) {
    console.log(`${row.id} (${row.label})`);
    for (const cost of row.scenarioCosts) {
      console.log(
        `  ${cost.gwei.toString()} gwei -> ${cost.costEth.toFixed(8)} ETH (~$${cost.costUsd.toFixed(4)})`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
