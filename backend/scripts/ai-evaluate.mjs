import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRiskLevel } from '../src/services/ai/inference.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, '..', 'test', 'fixtures', 'ai-risk-validation-dataset.json');
const labels = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

function safeDivide(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function round(value) {
  return Number(value.toFixed(4));
}

function loadDataset() {
  return JSON.parse(readFileSync(datasetPath, 'utf8'));
}

function buildConfusionMatrix() {
  const matrix = {};
  for (const actual of labels) {
    matrix[actual] = {};
    for (const predicted of labels) {
      matrix[actual][predicted] = 0;
    }
  }
  return matrix;
}

function evaluateDataset(dataset) {
  const confusionMatrix = buildConfusionMatrix();
  const perClass = {};
  let correct = 0;

  for (const sample of dataset) {
    const predicted = computeRiskLevel(sample);
    const actual = sample.expectedRiskLevel;
    if (!labels.includes(actual)) {
      throw new Error(`Unknown expected label '${actual}' in sample ${sample.id}`);
    }
    if (!labels.includes(predicted)) {
      throw new Error(`Unknown predicted label '${predicted}' in sample ${sample.id}`);
    }

    confusionMatrix[actual][predicted] += 1;
    if (actual === predicted) correct += 1;
  }

  for (const label of labels) {
    const tp = confusionMatrix[label][label];
    let fp = 0;
    let fn = 0;

    for (const other of labels) {
      if (other !== label) {
        fp += confusionMatrix[other][label];
        fn += confusionMatrix[label][other];
      }
    }

    const precision = safeDivide(tp, tp + fp);
    const recall = safeDivide(tp, tp + fn);
    const f1 = safeDivide(2 * precision * recall, precision + recall);

    perClass[label] = {
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
      support: labels.reduce((sum, predicted) => sum + confusionMatrix[label][predicted], 0),
    };
  }

  const accuracy = safeDivide(correct, dataset.length);
  const macroPrecision = safeDivide(labels.reduce((sum, label) => sum + perClass[label].precision, 0), labels.length);
  const macroRecall = safeDivide(labels.reduce((sum, label) => sum + perClass[label].recall, 0), labels.length);
  const macroF1 = safeDivide(labels.reduce((sum, label) => sum + perClass[label].f1, 0), labels.length);

  return {
    evaluatedAt: new Date().toISOString(),
    datasetPath,
    samples: dataset.length,
    metrics: {
      accuracy: round(accuracy),
      macroPrecision: round(macroPrecision),
      macroRecall: round(macroRecall),
      macroF1: round(macroF1),
    },
    confusionMatrix,
    perClass,
  };
}

function printResults(results) {
  console.log('BioTrack AI Risk Evaluation');
  console.log(`Dataset: ${results.datasetPath}`);
  console.log(`Samples: ${results.samples}`);
  console.log('');
  console.log('Overall metrics');
  console.log(`Accuracy: ${results.metrics.accuracy}`);
  console.log(`Macro precision: ${results.metrics.macroPrecision}`);
  console.log(`Macro recall: ${results.metrics.macroRecall}`);
  console.log(`Macro F1: ${results.metrics.macroF1}`);
  console.log('');
  console.log('Per-class metrics');
  for (const label of labels) {
    const metrics = results.perClass[label];
    console.log(
      `${label}: precision=${metrics.precision} recall=${metrics.recall} f1=${metrics.f1} support=${metrics.support}`
    );
  }
  console.log('');
  console.log('Confusion matrix');
  console.log(JSON.stringify(results.confusionMatrix, null, 2));
}

const dataset = loadDataset();
const results = evaluateDataset(dataset);
printResults(results);
