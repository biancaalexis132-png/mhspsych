// Extract ALL quiz data for the user's requested topics
const fs = require('fs');
const content = fs.readFileSync('./content.js', 'utf8');
const lines = content.split('\n');
const match = content.match(/const CONTENT_DATA = (\{[\s\S]*\});/);
const CONTENT_DATA = eval('(' + match[1] + ')');

function findLine(text) {
  if (!text) return null;
  const searchStr = text.substring(0, Math.min(40, text.length));
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) return i + 1;
  }
  return null;
}

// Gather all quiz questions from ALL lessons
const allLessons = [];
for (const mod of CONTENT_DATA.modules) {
  if (!mod.lessons) continue;
  for (const lesson of mod.lessons) {
    const allQs = [...(lesson.quizQuestions || [])];
    (lesson.sections || []).forEach(s => {
      if (s.type === 'quiz' && s.questions) allQs.push(...s.questions);
    });
    allLessons.push({
      title: lesson.title,
      id: lesson.id,
      line: findLine(lesson.title),
      questions: allQs
    });
  }
}

// Define the exact topic-to-search mapping
const topics = [
  { name: 'Paliperidone (Invega)', pattern: /paliperidone|invega/i },
  { name: 'Risperidone (Risperdal)', pattern: /risperidone|risperdal/i },
  { name: 'Fluphenazine (Prolixin)', lessonId: 'lesson-fluphenazine' },
  { name: 'Haloperidol (Haldol)', pattern: /haloperidol|haldol/i },
  { name: 'Schizophrenia (All quiz Qs)', pattern: /schizophrenia/i },
  { name: 'Carbamazepine/Oxcarbazepine', pattern: /carbamazepine|oxcarbazepine|tegretol|trileptal/i },
  { name: 'Lamotrigine & Carbamazepine (Lesson)', lessonId: 'lesson-lamotrigine' },
  { name: 'Valproate (Depakote)', lessonId: 'lesson-valproate' },
  { name: 'Lithium', lessonId: 'lesson-lithium' },
  { name: 'Bipolar (All quiz Qs)', pattern: /bipolar/i },
  { name: 'Trintellix/Viibryd', pattern: /trintellix|viibryd|vortioxetine|vilazodone/i },
  { name: 'SNRI Savella/Fetzima (Milnacipran/Levomilnacipran)', pattern: /savella|fetzima|milnacipran|levomilnacipran/i },
  { name: 'Duloxetine (Cymbalta) - in SNRI Lesson', pattern: /duloxetine|cymbalta/i },
  { name: 'SNRIs: Venlafaxine, Duloxetine & Desvenlafaxine (Lesson)', lessonId: 'lesson-snris' },
  { name: 'Mirtazapine (Remeron)', lessonId: 'lesson-mirtazapine' },
  { name: 'Bupropion (Wellbutrin)', lessonId: 'lesson-bupropion' },
  { name: 'SSRIs (Lesson - contains Sertraline/Escitalopram/Fluvoxamine/Paroxetine/Fluoxetine/Citalopram)', lessonId: 'lesson-ssris' },
  { name: 'Cobenfy (Xanomeline-Trospium)', pattern: /cobenfy|xanomeline|trospium/i },
  { name: 'Ulotaront/TAAR1', pattern: /ulotaront|taar1/i },
  { name: 'Delirium', pattern: /delirium/i },
  { name: 'Amphetamines', pattern: /amphetamine|adderall/i },
  { name: 'Stimulants, Cannabis & Co-occurring (Lesson)', lessonId: 'lesson-stimulants-cannabis' },
  { name: 'Clonidine/Guanfacine', pattern: /clonidine|guanfacine/i },
  { name: 'Geriatric Psychiatry: Delirium, Dementia (Lesson)', lessonId: 'lesson-geriatric-psychiatry' },
];

function formatQ(q, idx) {
  let out = '';
  out += `\n--- Q${idx} [${q.id||''}] (${q.type||'single'}) ---\n`;
  out += `Stem: ${q.stem}\n`;
  if (q.options) {
    q.options.forEach(o => {
      const mark = (q.correct||[]).includes(o.id) ? ' ✓ CORRECT' : '';
      out += `  ${o.id.toUpperCase()}. ${o.text}${mark}\n`;
    });
  }
  out += `Correct Answer: ${(q.correct||[]).join(', ').toUpperCase()}\n`;
  if (q.explanation) out += `Explanation: ${q.explanation}\n`;
  return out;
}

let output = '';

for (const topic of topics) {
  output += `\n${'='.repeat(80)}\n`;
  output += `TOPIC: ${topic.name}\n`;
  output += `${'='.repeat(80)}\n`;
  
  if (topic.lessonId) {
    // Get quiz from the specific lesson
    const lesson = allLessons.find(l => l.id === topic.lessonId);
    if (lesson) {
      output += `Source Lesson: ${lesson.title} (${lesson.id})\n`;
      output += `Line in content.js: ${lesson.line}\n`;
      output += `Total Questions: ${lesson.questions.length}\n`;
      lesson.questions.forEach((q, i) => {
        output += formatQ(q, i + 1);
      });
    } else {
      output += 'NOT FOUND\n';
    }
  } else if (topic.pattern) {
    // Search across ALL lessons for matching quiz questions
    let totalFound = 0;
    for (const lesson of allLessons) {
      const matchingQs = lesson.questions.filter(q => {
        const text = (q.stem || '') + ' ' + (q.explanation || '') + ' ' + ((q.options||[]).map(o=>o.text).join(' '));
        return topic.pattern.test(text);
      });
      if (matchingQs.length > 0) {
        output += `\n  From: ${lesson.title} (${lesson.id}, line ${lesson.line})\n`;
        matchingQs.forEach((q, i) => {
          totalFound++;
          output += formatQ(q, totalFound);
        });
      }
    }
    if (totalFound === 0) {
      output += 'NO quiz questions found for this topic in any lesson.\n';
    } else {
      output += `\nTotal questions found: ${totalFound}\n`;
    }
  }
}

fs.writeFileSync('/tmp/all-quiz-data.txt', output);
console.log('Written to /tmp/all-quiz-data.txt');
console.log('Lines:', output.split('\n').length);
