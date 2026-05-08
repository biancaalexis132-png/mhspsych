// Extract quiz data from content.js - comprehensive search
const fs = require('fs');
const content = fs.readFileSync('./content.js', 'utf8');
const lines = content.split('\n');

// Extract the CONTENT_DATA object
const match = content.match(/const CONTENT_DATA = (\{[\s\S]*\});/);
if (!match) { console.log("Could not find CONTENT_DATA"); process.exit(1); }
const CONTENT_DATA = eval('(' + match[1] + ')');

function findLine(text) {
  const searchStr = text.substring(0, Math.min(40, text.length));
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) return i + 1;
  }
  return null;
}

function extractQuiz(item) {
  const result = {
    title: item.title || '',
    id: item.id || '',
    lineNumber: findLine(item.title || item.id || ''),
    quizQuestions: item.quizQuestions || [],
    inlineQuizzes: []
  };
  if (item.sections) {
    for (const section of item.sections) {
      if (section.type === 'quiz' && section.questions) {
        result.inlineQuizzes.push({
          sectionId: section.id,
          sectionTitle: section.title || '',
          questions: section.questions
        });
      }
    }
  }
  return result;
}

// Collect ALL items from all sources
const allItems = [];

// From modules/lessons
if (CONTENT_DATA.modules) {
  for (const mod of CONTENT_DATA.modules) {
    if (mod.lessons) {
      for (const lesson of mod.lessons) {
        allItems.push(lesson);
      }
    }
  }
}
// From podcasts
if (CONTENT_DATA.podcasts) {
  for (const p of CONTENT_DATA.podcasts) allItems.push(p);
}
// From cases
if (CONTENT_DATA.cases) {
  for (const c of CONTENT_DATA.cases) allItems.push(c);
}

// Now search ALL items against ALL terms, also searching description/content
const searchTerms = [
  'paliperidone', 'invega',
  'risperidone', 'risperdal',
  'fluphenazine', 'prolixin',
  'haloperidol', 'haldol',
  'schizophrenia',
  'carbamazepine', 'oxcarbazepine', 'tegretol', 'trileptal',
  'lamotrigine', 'lamictal',
  'valproate', 'depakote',
  'lithium',
  'bipolar',
  'trintellix', 'viibryd',
  'savella', 'fetzima', 'milnacipran', 'levomilnacipran',
  'duloxetine', 'cymbalta',
  'venlafaxine', 'desvenlafaxine', 'effexor', 'pristiq',
  'mirtazapine', 'remeron',
  'bupropion', 'wellbutrin',
  'sertraline', 'escitalopram', 'zoloft', 'lexapro',
  'fluvoxamine', 'paroxetine', 'fluoxetine', 'citalopram', 'luvox', 'paxil', 'prozac', 'celexa',
  'ssri',
  'cobenfy', 'xanomeline', 'trospium',
  'ulotaront', 'taar1',
  'delirium',
  'amphetamine',
  'clonidine', 'guanfacine'
];

const results = [];
const seenIds = new Set();

for (const item of allItems) {
  if (seenIds.has(item.id)) continue;
  
  const title = (item.title || '').toLowerCase();
  const id = (item.id || '').toLowerCase();
  const tags = ((item.tags || []).join(' ')).toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const combined = title + ' ' + id + ' ' + tags + ' ' + desc;
  
  const matchesAny = searchTerms.some(term => combined.includes(term));
  
  if (matchesAny) {
    const quizData = extractQuiz(item);
    const totalQ = quizData.quizQuestions.length + quizData.inlineQuizzes.reduce((a,q) => a + q.questions.length, 0);
    if (totalQ > 0) {
      seenIds.add(item.id);
      results.push(quizData);
    }
  }
}

console.log(JSON.stringify(results, null, 2));
