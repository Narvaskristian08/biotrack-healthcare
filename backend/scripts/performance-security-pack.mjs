import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import ganache from 'ganache';
import solc from 'solc';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const anchorContractPath = path.resolve(__dirname, '..', 'contracts', 'BioTrackMessageAnchor.sol');
const registriesContractPath = path.resolve(__dirname, '..', 'contracts', 'BioTrackRegistries.sol');
const reportPath = path.resolve(repoRoot, 'docs', 'PERFORMANCE_SECURITY_TEST_RESULTS.md');
const reportJsonPath = path.resolve(repoRoot, '.runlogs', 'performance-security-pack.json');

function compileContracts(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const input = {
    language: 'Solidity',
    sources: {
      [fileName]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((entry) => entry.severity === 'error');
  if (errors.length > 0) {
    const details = errors.map((entry) => entry.formattedMessage).join('\n');
    throw new Error(`Solidity compilation failed for ${fileName}:\n${details}`);
  }

  return output.contracts?.[fileName] ?? {};
}

function getReasonFromError(error) {
  const candidates = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.info?.error?.data?.reason,
    error?.info?.error?.data?.message,
    error?.info?.error?.message,
    error?.error?.message,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const text = String(candidate);
    const reasonMatch = text.match(/reason string ['"]([^'"]+)['"]/i);
    if (reasonMatch?.[1]) return reasonMatch[1];
    if (text.includes('execution reverted')) return text;
  }

  return 'unknown error';
}

async function tryStaticRevertReason(action) {
  try {
    await action();
    return '';
  } catch (error) {
    return getReasonFromError(error);
  }
}

function markdownTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return [head, divider, body].join('\n');
}

async function runPerformanceCases(anchorContract) {
  const cases = [
    {
      id: 'P1',
      name: 'Normal Input',
      step: 'Submit standard text',
      input: 'Patient A Heart Rate 78 BPM',
      expected: '< 200ms',
      expectSuccess: true,
      maxMs: 200,
      note: 'Baseline',
    },
    {
      id: 'P2',
      name: 'Long Input',
      step: 'Paste 1000+ chars',
      input: 'L'.repeat(1000),
      expected: 'Process/Error',
      expectSuccess: false,
      note: 'Stress length guard',
    },
    {
      id: 'P3',
      name: 'Empty Input',
      step: 'Submit blank field',
      input: '',
      expected: 'Handle gracefully',
      expectSuccess: false,
      note: 'Validation guard',
    },
    {
      id: 'P4',
      name: 'Custom Case 1',
      step: 'Submit 64-char payload',
      input: 'm'.repeat(64),
      expected: '< 200ms',
      expectSuccess: true,
      maxMs: 200,
      note: 'Medium payload',
    },
    {
      id: 'P5',
      name: 'Custom Case 2',
      step: 'Submit max 280-char payload',
      input: 'm'.repeat(280),
      expected: '< 250ms',
      expectSuccess: true,
      maxMs: 250,
      note: 'Boundary payload',
    },
  ];

  const results = [];
  for (const entry of cases) {
    const startedAt = performance.now();
    try {
      if (!entry.expectSuccess) {
        const reason = await tryStaticRevertReason(() =>
          anchorContract.setMessage.staticCall(entry.input)
        );
        throw new Error(reason || 'expected revert');
      }

      const tx = await anchorContract.setMessage(entry.input);
      const receipt = await tx.wait();
      const elapsedMs = performance.now() - startedAt;
      const gasUsed = Number(receipt.gasUsed ?? 0);
      const isPass = entry.expectSuccess && (entry.maxMs ? elapsedMs <= entry.maxMs : true);

      results.push({
        ...entry,
        elapsedMs,
        gasUsed,
        actual: `${elapsedMs.toFixed(1)}ms / gas ${gasUsed.toLocaleString()}`,
        pass: isPass,
      });
    } catch (error) {
      const elapsedMs = performance.now() - startedAt;
      const reason = getReasonFromError(error);
      const isPass = !entry.expectSuccess;

      results.push({
        ...entry,
        elapsedMs,
        gasUsed: null,
        actual: `${elapsedMs.toFixed(1)}ms / revert: ${reason}`,
        pass: isPass,
      });
    }
  }

  return results;
}

async function runSecurityCases(identityRegistry, recordRegistry, ownerSigner, attackerSigner) {
  const attackerAddress = await attackerSigner.getAddress();
  const ownerAddress = await ownerSigner.getAddress();
  const ownerIdentity = identityRegistry.connect(ownerSigner);
  const attackerIdentity = identityRegistry.connect(attackerSigner);
  const ownerRecord = recordRegistry.connect(ownerSigner);
  const attackerRecord = recordRegistry.connect(attackerSigner);

  const hashA = ethers.id('identity-a');
  const hashB = ethers.id('identity-b');
  const hashC = ethers.id('identity-c');
  const recordHash = ethers.id('record-hash-shared');
  const subjectHashA = ethers.id('subject-123456');
  const subjectHashB = ethers.id('subject-654321');
  const subjectHashC = ethers.id('subject-abcd001');

  const cases = [];

  // S1 Authorization
  {
    const reason = await tryStaticRevertReason(() =>
      attackerIdentity.setWriter.staticCall(attackerAddress, true)
    );
    const actual = reason ? `Reverted: ${reason}` : 'Unexpected success';
    const pass = Boolean(reason);
    cases.push({
      id: 'S1',
      name: 'Authorization',
      step: 'Call setWriter as non-owner',
      expected: 'Revert "Not authorized"',
      actual,
      pass,
      note: 'Access Control',
    });
  }

  // S2 Invalid input
  {
    const reason = await tryStaticRevertReason(() =>
      ownerIdentity.registerIdentity.staticCall('', hashA, 'patient', subjectHashA, ethers.ZeroAddress)
    );
    const actual = reason ? `Reverted: ${reason}` : 'Unexpected success';
    const pass = Boolean(reason);
    cases.push({
      id: 'S2',
      name: 'Invalid Input',
      step: 'Call registerIdentity with empty identityId',
      expected: 'Revert/Safe handle',
      actual,
      pass,
      note: 'Edge Case',
    });
  }

  // S3 Data exposure
  {
    const sensitiveSubjectId = '123456';
    const tx = await ownerIdentity.registerIdentity('PAT002', hashA, 'patient', subjectHashA, ethers.ZeroAddress);
    const receipt = await tx.wait();
    const parsed = receipt.logs
      .map((log) => {
        try {
          return ownerIdentity.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((entry) => entry?.name === 'IdentityRegistered');

    const emittedSubjectId = String(parsed?.args?.subjectId ?? '');
    const emittedSubjectIdHash = String(parsed?.args?.subjectIdHash ?? '');
    const leaked = emittedSubjectId === sensitiveSubjectId ||
      emittedSubjectIdHash.toLowerCase() === sensitiveSubjectId.toLowerCase();

    cases.push({
      id: 'S3',
      name: 'Data Exposure',
      step: 'Inspect IdentityRegistered event fields',
      expected: 'No sensitive leaks',
      actual: leaked
        ? `Sensitive subjectId emitted in log: ${emittedSubjectId || emittedSubjectIdHash}`
        : `No sensitive value leaked (subjectIdHash: ${emittedSubjectIdHash || 'n/a'})`,
      pass: !leaked,
      note: 'Privacy',
    });
  }

  // S4 Replay / duplicate identity
  {
    const reason = await tryStaticRevertReason(() =>
      ownerIdentity.registerIdentity.staticCall('PAT002', hashA, 'patient', subjectHashA, ethers.ZeroAddress)
    );
    const actual = reason ? `Reverted: ${reason}` : 'Unexpected success';
    const pass = Boolean(reason);
    cases.push({
      id: 'S4',
      name: 'Replay Attack',
      step: 'Re-submit same identityId/hash',
      expected: 'Revert duplicate',
      actual,
      pass,
      note: 'Replay Guard',
    });
  }

  // S5 Pause writes and verify enforcement
  {
    await ownerIdentity.setWritesPaused(true);

    const reason = await tryStaticRevertReason(() =>
      ownerIdentity.registerIdentity.staticCall('PAT003', hashB, 'patient', subjectHashB, ethers.ZeroAddress)
    );
    const actual = reason ? `Reverted: ${reason}` : 'Unexpected success';
    const pass = Boolean(reason);

    await ownerIdentity.setWritesPaused(false);

    cases.push({
      id: 'S5',
      name: 'Emergency Pause',
      step: 'Pause writes, then call registerIdentity',
      expected: 'Revert "Writes paused"',
      actual,
      pass,
      note: 'Safety Switch',
    });
  }

  // S6 Record hash replay
  {
    await ownerIdentity.registerIdentity('PAT004', hashC, 'patient', subjectHashC, ownerAddress);
    await ownerRecord.anchorRecord('REC001', 'PAT001', recordHash, 'PAT004');

    const reason = await tryStaticRevertReason(() =>
      ownerRecord.anchorRecord.staticCall('REC002', 'PAT001', recordHash, 'PAT004')
    );
    const actual = reason ? `Reverted: ${reason}` : 'Unexpected success';
    const pass = Boolean(reason);

    cases.push({
      id: 'S6',
      name: 'Record Hash Replay',
      step: 'Anchor second record with same recordHash',
      expected: 'Revert duplicate hash',
      actual,
      pass,
      note: 'Integrity',
    });
  }

  // Extra authorization check on record contract.
  {
    const reason = await tryStaticRevertReason(() =>
      attackerRecord.anchorRecord.staticCall('RECX', 'PATX', ethers.id('other'), 'PAT004')
    );
    const actual = reason ? `Reverted: ${reason}` : 'Unexpected success';
    const pass = Boolean(reason);
    cases.push({
      id: 'S7',
      name: 'Record Authorization',
      step: 'Call anchorRecord as non-writer',
      expected: 'Revert "Not authorized"',
      actual,
      pass,
      note: 'Access Control',
    });
  }

  // S8 Export wallet authorization
  {
    const reason = await tryStaticRevertReason(() =>
      attackerRecord.requestRecordExport.staticCall('REC001', recordHash, 'PAT004')
    );
    const actual = reason ? `Reverted: ${reason}` : 'Unexpected success';
    const pass = Boolean(reason);
    cases.push({
      id: 'S8',
      name: 'Export Wallet Authorization',
      step: 'Request record export from a wallet that is not linked to the patient identity',
      expected: 'Revert unauthorized export request',
      actual,
      pass,
      note: 'Wallet Ownership',
    });
  }

  return cases;
}

function buildReportMarkdown({ generatedAtIso, performanceResults, securityResults }) {
  const performanceTable = markdownTable(
    ['Test Case', 'Steps (Short)', 'Expected', 'Actual (time/gas)', 'Pass/Fail', 'Note'],
    performanceResults.map((entry) => [
      entry.name,
      entry.step,
      entry.expected,
      entry.actual,
      entry.pass ? 'PASS' : 'FAIL',
      entry.note,
    ])
  );

  const securityTable = markdownTable(
    ['Test Case', 'Steps (Short)', 'Expected', 'Actual', 'Pass/Fail', 'Note'],
    securityResults.map((entry) => [
      entry.name,
      entry.step,
      entry.expected,
      entry.actual,
      entry.pass ? 'PASS' : 'FAIL',
      entry.note,
    ])
  );

  const slowest = [...performanceResults]
    .sort((a, b) => Number(b.elapsedMs ?? 0) - Number(a.elapsedMs ?? 0))[0];
  const failedSecurity = securityResults.find((entry) => !entry.pass);
  const riskMitigation =
    failedSecurity?.name === 'Data Exposure'
      ? '- Replace clear-text `subjectId` event field with a one-way hash or pseudonymous token.\n- Keep sensitive identifiers off-chain; anchor only cryptographic digests.\n- If analytics needs identity grouping, emit salted/grouped IDs that are not reversible.'
      : '- Keep this case monitored in CI and rerun pack after contract or API changes.';

  return [
    '# Performance And Security Test Results',
    '',
    `Generated at: ${generatedAtIso}`,
    '',
    '## Performance Test Pack',
    '',
    performanceTable,
    '',
    `Slowest case: **${slowest?.name ?? 'N/A'}** (${Number(slowest?.elapsedMs ?? 0).toFixed(1)}ms).`,
    '',
    '## Security Test Pack',
    '',
    securityTable,
    '',
    `Most concerning risk: **${failedSecurity?.name ?? 'None identified'}**.`,
    failedSecurity
      ? `Reason: ${failedSecurity.actual}`
      : 'Reason: No failing security case in this run.',
    '',
    'Recommended fix for best risk:',
    '',
    riskMitigation,
    '',
    '## Notes',
    '',
    '- Local benchmark environment: Ganache in-memory chain.',
    '- Performance timings reflect local execution latency and are best used for relative comparison.',
    '- Security results are contract-level behavior checks for access control, input validation, replay resistance, and data exposure.',
    '',
  ].join('\n');
}

async function main() {
  const anchorContracts = compileContracts(anchorContractPath);
  const registriesContracts = compileContracts(registriesContractPath);

  const anchorCompiled = anchorContracts?.BioTrackMessageAnchor;
  const identityCompiled = registriesContracts?.IdentityRegistry;
  const recordCompiled = registriesContracts?.RecordProofRegistry;

  if (!anchorCompiled?.abi || !anchorCompiled?.evm?.bytecode?.object) {
    throw new Error('Failed to compile BioTrackMessageAnchor');
  }
  if (!identityCompiled?.abi || !identityCompiled?.evm?.bytecode?.object) {
    throw new Error('Failed to compile IdentityRegistry');
  }
  if (!recordCompiled?.abi || !recordCompiled?.evm?.bytecode?.object) {
    throw new Error('Failed to compile RecordProofRegistry');
  }

  const provider = new ethers.BrowserProvider(
    ganache.provider({
      logging: { quiet: true },
      chain: { chainId: 1337 },
    })
  );

  const ownerSigner = await provider.getSigner(0);
  const attackerSigner = await provider.getSigner(1);

  const anchorFactory = new ethers.ContractFactory(
    anchorCompiled.abi,
    `0x${anchorCompiled.evm.bytecode.object}`,
    ownerSigner
  );
  const identityFactory = new ethers.ContractFactory(
    identityCompiled.abi,
    `0x${identityCompiled.evm.bytecode.object}`,
    ownerSigner
  );
  const recordFactory = new ethers.ContractFactory(
    recordCompiled.abi,
    `0x${recordCompiled.evm.bytecode.object}`,
    ownerSigner
  );

  const anchorContract = await anchorFactory.deploy();
  await anchorContract.waitForDeployment();

  const identityRegistry = await identityFactory.deploy();
  await identityRegistry.waitForDeployment();

  const recordRegistry = await recordFactory.deploy(await identityRegistry.getAddress());
  await recordRegistry.waitForDeployment();

  const performanceResults = await runPerformanceCases(anchorContract);
  const securityResults = await runSecurityCases(
    identityRegistry,
    recordRegistry,
    ownerSigner,
    attackerSigner
  );

  const generatedAtIso = new Date().toISOString();
  const markdown = buildReportMarkdown({
    generatedAtIso,
    performanceResults,
    securityResults,
  });

  mkdirSync(path.dirname(reportPath), { recursive: true });
  mkdirSync(path.dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportPath, markdown, 'utf8');
  writeFileSync(
    reportJsonPath,
    JSON.stringify(
      {
        generatedAtIso,
        performanceResults,
        securityResults,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Wrote report: ${reportPath}`);
  console.log(`Wrote raw JSON: ${reportJsonPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
