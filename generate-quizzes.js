#!/usr/bin/env node
// Quiz Page Generator for MHS Psych Curriculum
// Generates standalone HTML quiz pages from quiz data

const fs = require('fs');
const path = require('path');

function generateQuizHTML(title, category, questions) {
  const questionsHTML = questions.map((q, i) => {
    const optionsHTML = q.options.map((opt, j) => {
      const letter = String.fromCharCode(65 + j);
      const isCorrect = letter === q.correct;
      return `      <div class="quiz-option" data-correct="${isCorrect}" onclick="selectOption(this, ${i})">
        <div class="quiz-radio"></div>
        <span><strong>${letter}.</strong> ${escapeHTML(opt)}</span>
      </div>`;
    }).join('\n');

    return `    <div class="quiz-question" id="q${i}">
      <div class="quiz-stem">${i + 1}. ${escapeHTML(q.stem)}</div>
${optionsHTML}
      <div class="explanation-box" style="display:none">${escapeHTML(q.explanation || '')}</div>
    </div>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHTML(title)} – Quiz</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Jost:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
:root {
  --bg:#faf8f5;--bg2:#ffffff;--bg3:#f5f0ea;--surface:#f0ebe3;--surface2:#e8dfd4;
  --border:#ddd3c4;--border2:#c9b9a6;--text:#2d1f14;--text2:#6b5143;--text3:#9e8270;
  --accent:#b5845a;--accent2:#c9956b;--green:#6b8f71;--yellow:#c49a3c;--red:#b05050;
  --purple:#7e6a9e;--cyan:#4d8a8a;--cream:#fdf9f4;
  --font-head:'Cormorant Garamond',Georgia,serif;
  --font-body:'Jost',sans-serif;
  --font-mono:'DM Mono',monospace;
  --radius:10px;--radius-sm:6px;
  --shadow:0 2px 16px rgba(45,31,20,0.08);
  --shadow-lg:0 6px 40px rgba(45,31,20,0.12);
}
*{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6}
a{color:var(--accent2);text-decoration:none}
button{cursor:pointer;font-family:var(--font-body);border:none;background:none;color:inherit}
h1,h2,h3,h4{font-family:var(--font-head);line-height:1.2}

.app-nav{background:var(--cream);border-bottom:1px solid var(--border);padding:0 28px;display:flex;align-items:center;gap:16px;height:64px;position:sticky;top:0;z-index:100;box-shadow:0 1px 12px rgba(45,31,20,0.06)}
.nav-brand{font-family:var(--font-head);font-size:1.35rem;font-weight:600;color:var(--text);letter-spacing:.01em;display:flex;align-items:center;gap:8px;font-style:italic;text-decoration:none}
.nav-brand span{color:var(--accent);font-style:normal;font-weight:400}
.nav-links{display:flex;gap:2px;margin-left:auto;align-items:center}
.nav-link{padding:6px 14px;border-radius:20px;font-size:.8rem;font-weight:500;letter-spacing:.02em;text-transform:uppercase;color:var(--text3);transition:all .18s;cursor:pointer;text-decoration:none}
.nav-link:hover{color:var(--text);background:var(--surface)}
.nav-link.active{background:var(--accent);color:#fff}

.main-content{flex:1;padding:36px 28px;max-width:860px;margin:0 auto;width:100%}

.quiz-header{margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.quiz-category{font-size:.75rem;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.quiz-title{font-family:var(--font-head);font-size:2rem;font-weight:600;color:var(--text);font-style:italic;margin-bottom:8px}
.quiz-meta{font-size:.85rem;color:var(--text3)}

.quiz-container{max-width:700px}
.quiz-question{margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid var(--border)}
.quiz-question:last-child{border-bottom:none}
.quiz-stem{font-weight:500;margin-bottom:14px;line-height:1.7;font-size:.95rem;color:var(--text)}
.quiz-option{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer;transition:all .15s;font-size:.9rem;color:var(--text2)}
.quiz-option:hover:not(.disabled){border-color:var(--accent);background:rgba(181,132,90,.05)}
.quiz-option.selected{border-color:var(--accent);background:rgba(181,132,90,.08)}
.quiz-option.correct{border-color:var(--green);background:rgba(107,143,113,.08);color:var(--green)}
.quiz-option.incorrect{border-color:var(--red);background:rgba(176,80,80,.07);color:var(--red)}
.quiz-option.disabled{cursor:not-allowed;opacity:.7}
.quiz-option.show-correct{border-color:var(--green);background:rgba(107,143,113,.08)}
.quiz-radio{width:18px;height:18px;border:1.5px solid var(--border2);border-radius:50%;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.quiz-radio.filled{background:var(--accent);border-color:var(--accent)}
.quiz-radio.filled::after{content:'';width:6px;height:6px;border-radius:50%;background:#fff}
.explanation-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-top:10px;font-size:.875rem;color:var(--text2);line-height:1.7}

.score-bar{position:sticky;bottom:0;background:var(--cream);border-top:1px solid var(--border);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;z-index:50}
.score-text{font-size:.9rem;color:var(--text2)}
.score-text strong{color:var(--text);font-family:var(--font-head);font-size:1.1rem}
.progress-bar{flex:1;max-width:300px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden}
.progress-fill{height:100%;border-radius:3px;background:var(--green);transition:width .3s ease;width:0%}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 22px;border-radius:var(--radius-sm);font-size:.85rem;font-weight:500;letter-spacing:.03em;transition:all .18s;cursor:pointer;border:none}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#a0733e;box-shadow:0 4px 12px rgba(181,132,90,.3)}
.btn-outline{background:transparent;border:1px solid var(--border2);color:var(--text2)}
.btn-outline:hover{border-color:var(--accent);color:var(--accent)}

.results-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center;margin:32px 0}
.results-score{font-family:var(--font-head);font-size:3rem;font-weight:700;color:var(--accent);margin-bottom:8px}
.results-label{font-size:1rem;color:var(--text2);margin-bottom:16px}
.results-bar{height:8px;background:var(--surface2);border-radius:4px;overflow:hidden;max-width:300px;margin:0 auto 16px}
.results-fill{height:100%;border-radius:4px;transition:width .5s ease}

@media(max-width:600px){
  .main-content{padding:20px 16px}
  .quiz-title{font-size:1.5rem}
  .score-bar{padding:10px 16px;flex-wrap:wrap}
  .app-nav{padding:0 16px}
}
</style>
</head>
<body>
<nav class="app-nav">
  <a class="nav-brand" href="../index.html">Psych<span>Curriculum</span></a>
  <div class="nav-links">
    <a class="nav-link" href="../index.html">Home</a>
    <a class="nav-link active" href="index.html">Quizzes</a>
  </div>
</nav>
<div class="main-content">
  <div class="quiz-header">
    <div class="quiz-category">${escapeHTML(category)}</div>
    <h1 class="quiz-title">${escapeHTML(title)}</h1>
    <div class="quiz-meta"><span id="totalQ">${questions.length}</span> questions</div>
  </div>
  <div class="quiz-container" id="quizBody">
${questionsHTML}
  </div>
  <div class="results-card" id="resultsCard" style="display:none">
    <div class="results-score" id="finalScore">0%</div>
    <div class="results-label" id="finalLabel">0 / ${questions.length} correct</div>
    <div class="results-bar"><div class="results-fill" id="finalBar" style="width:0%;background:var(--green)"></div></div>
    <button class="btn btn-primary" onclick="resetQuiz()" style="margin-top:12px">Retake Quiz</button>
    <a class="btn btn-outline" href="index.html" style="margin-top:8px;display:inline-flex">Back to All Quizzes</a>
  </div>
</div>
<div class="score-bar" id="scoreBar">
  <div class="score-text">Score: <strong><span id="scoreNum">0</span> / ${questions.length}</strong></div>
  <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
  <button class="btn btn-primary" id="finishBtn" onclick="finishQuiz()" style="display:none">View Results</button>
</div>
<script>
let answered=0,correct=0,total=${questions.length};
function selectOption(el,qi){
  const q=document.getElementById('q'+qi);
  if(q.classList.contains('answered'))return;
  q.classList.add('answered');
  const opts=q.querySelectorAll('.quiz-option');
  const isCorrect=el.dataset.correct==='true';
  opts.forEach(o=>{
    o.classList.add('disabled');
    if(o.dataset.correct==='true'){o.classList.add('show-correct');o.querySelector('.quiz-radio').classList.add('filled')}
  });
  if(isCorrect){el.classList.add('correct');correct++}
  else{el.classList.add('incorrect')}
  el.querySelector('.quiz-radio').classList.add('filled');
  const expl=q.querySelector('.explanation-box');
  if(expl&&expl.textContent.trim())expl.style.display='block';
  answered++;
  document.getElementById('scoreNum').textContent=correct;
  document.getElementById('progressFill').style.width=(answered/total*100)+'%';
  if(answered===total)document.getElementById('finishBtn').style.display='inline-flex';
}
function finishQuiz(){
  const pct=Math.round(correct/total*100);
  document.getElementById('finalScore').textContent=pct+'%';
  document.getElementById('finalLabel').textContent=correct+' / '+total+' correct';
  document.getElementById('finalBar').style.width=pct+'%';
  if(pct>=80)document.getElementById('finalBar').style.background='var(--green)';
  else if(pct>=60)document.getElementById('finalBar').style.background='var(--yellow)';
  else document.getElementById('finalBar').style.background='var(--red)';
  document.getElementById('resultsCard').style.display='block';
  document.getElementById('resultsCard').scrollIntoView({behavior:'smooth'});
}
function resetQuiz(){
  answered=0;correct=0;
  document.querySelectorAll('.quiz-question').forEach(q=>{
    q.classList.remove('answered');
    q.querySelectorAll('.quiz-option').forEach(o=>{
      o.classList.remove('disabled','correct','incorrect','selected','show-correct');
      o.querySelector('.quiz-radio').classList.remove('filled');
    });
    const expl=q.querySelector('.explanation-box');
    if(expl)expl.style.display='none';
  });
  document.getElementById('scoreNum').textContent='0';
  document.getElementById('progressFill').style.width='0%';
  document.getElementById('finishBtn').style.display='none';
  document.getElementById('resultsCard').style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
}
</script>
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- QUIZ DATA ----
const quizzes = [];

// Helper to add quiz
function addQuiz(slug, title, category, questions) {
  quizzes.push({ slug, title, category, questions });
}

// Q helper: q(stem, options[], correctLetter, explanation?)
function q(stem, options, correct, explanation) {
  return { stem, options, correct: correct.toUpperCase(), explanation: explanation || '' };
}

// =====================================================
// BATCH 1: Foundational Topics
// =====================================================

addQuiz('triple-network-model', 'Triple Network Model', 'Neuroscience', [
  q('The triple network model posits a complex interplay between the DMN, CEN, and SN. Which statement most accurately describes the dynamic relationship and primary function of the Salience Network?',
    ['The SN primarily activates the DMN during focused tasks and deactivates the CEN during rest',
     'The SN is responsible for maintaining a balance of activity between the DMN and CEN, preventing either from becoming hyperactive',
     'The SN acts as a switchboard, identifying relevant internal or external stimuli and consequently activating the CEN for focused tasks or allowing the DMN to become active during a relaxed, unfocused state',
     'The SN consistently suppresses both the DMN and CEN to prevent cognitive overload during novel or highly stimulating situations'],
    'C'),
  q('Which of the following accurately defines cognitive flexibility and provides a disorder where its impairment might lead to specific behavioral observations?',
    ['The ability to maintain focus on relevant tasks while filtering distractions, often impaired in ADHD',
     'The ability to delay gratification and regulate emotions, often impaired in binge eating disorder',
     'The ability to adapt behavior based on new information and continually adjust to changing rules, which, when impaired, can contribute to cognitive rigidity observed in autism spectrum disorder',
     'The ability to temporarily hold information for task completion, which, when impaired, can be seen in neurodegenerative diseases'],
    'C'),
  q('Which combination accurately lists the three primary brain regions of the Default Mode Network (DMN) and names a neuroimaging technique mentioned in its discovery?',
    ['Precuneus, posterior cingulate cortex, medial prefrontal cortex; PET scans',
     'Anterior insula, dorsal anterior cingulate cortex, amygdala; EEG',
     'Ventral striatum, hippocampus, lateral temporal cortex; CT scans',
     'Dorsolateral prefrontal cortex, posterior parietal cortex, thalamus; MRI'],
    'A'),
  q('Which specific aberrant mechanism within the SN is proposed to lead to delusions in schizophrenia, and what neurotransmitter is associated with this process?',
    ['Hypoactivity of the SN causing a lack of relevance assignment to important stimuli, linked to serotonin',
     'Random spikes of dopamine in the SN, causing the brain to create explanations for increased salience in mundane events, linked to dopamine',
     'Overactivity of the SN causing a heightened filtering of sensory information, linked to glutamate',
     'Dysfunction of the SN\'s ability to switch between DMN and CEN, leading to a constant state of unfocused thought, linked to acetylcholine'],
    'B'),
  q('Which set of disorders is mentioned as potentially exhibiting DMN hypoactivity, and what shared symptom is linked to this?',
    ['ADHD and chronic pain disorders, linked to difficulties with attention maintenance',
     'Autism Spectrum Disorder, schizophrenia (negative symptoms), and neurodegenerative disorders, linked to disruptions in self-referential processing and social cognition',
     'PTSD and panic disorders, linked to an overreaction to normal environmental stimuli',
     'Binge eating disorder and gambling disorder, linked to impaired impulse control'],
    'B'),
  q('How do stimulant medications functionally impact the brain networks discussed to alleviate ADHD symptoms?',
    ['They directly reduce dopamine and norepinephrine in the prefrontal cortex, stimulating the DMN',
     'They increase dopamine and norepinephrine in the prefrontal cortex (part of the CEN), thereby shutting down the DMN',
     'They primarily target the Salience Network to increase the filtering of irrelevant stimuli',
     'They enhance acetylcholine activity within the DMN, promoting self-reflection'],
    'B'),
  q('Damage to the left dorsolateral prefrontal cortex seems to result in worsening depression. What is notably not seen with damage to the right side?',
    ['Worsening anxiety',
     'Worsening depression',
     'Worsening cognitive flexibility',
     'Worsening impulse control'],
    'B'),
  q('Dr. Robert Sapolsky\'s theory on auditory hallucinations in schizophrenia primarily attributes them to what phenomenon?',
    ['Aberrant Salience Network activation leading to misattribution of external sounds',
     'Hyperactivity of the DMN causing vivid internal fantasies that manifest as voices',
     'Misattribution of one\'s own sub-vocalized thoughts to an external voice due to aberrant salience intensifying these internal thoughts',
     'Dysfunction in the CEN\'s ability to filter out irrelevant auditory stimuli'],
    'C'),
  q('What specific aspect of CEN function does the Stroop test primarily measure?',
    ['Cognitive flexibility by determining how quickly a participant can change rules',
     'Working memory by requiring temporary retention of information',
     'The ability of the CEN to inhibit cognitive interference',
     'Attention regulation by assessing the ability to maintain focus'],
    'C'),
  q('What is the acknowledged limitation of the triple network model?',
    ['Its inability to be correlated with brain measurements from fMRIs and PET scans',
     'It is probably a huge oversimplification of how the brain works, with challenges in inductive reasoning from coherence and functional connectivity measurements',
     'It focuses too much on the chemical imbalance theory, which is poorly substantiated',
     'It primarily relies on self-report studies, which are prone to bias'],
    'B'),
  q('Which two dimensions of the Big Five personality model are highly correlated with hyperactivity of the DMN?',
    ['Extroversion and Conscientiousness; high intellectual curiosity',
     'Agreeableness and Neuroticism; a tendency to challenge authority',
     'Introversion and Openness to Experience; an active imagination and indulgence in fantasies',
     'Conscientiousness and Openness to Experience; a focus on external, somatic symptoms'],
    'C'),
  q('What specific stipulation does the DSM5-TR make regarding diagnosing schizophrenia when there is a history of ASD or communication disorder of childhood onset?',
    ['Schizophrenia cannot be diagnosed if ASD is already present',
     'The additional diagnosis of schizophrenia requires prominent delusions or hallucinations in addition to other required symptoms, present for at least one month',
     'Schizophrenia can only be diagnosed if the positive symptoms of ASD are absent',
     'The diagnosis of schizophrenia takes precedence over ASD regardless of presentation'],
    'B'),
  q('In autism spectrum disorder, how does salience network dysfunction manifest in terms of sensory processing?',
    ['Hypoactivity leading to a reduced ability to integrate emotional and bodily states',
     'Difficulty filtering out relevant social and emotional cues, leading to a struggle with "reading the room" and hyper-sensitivity to stimuli like specific sounds and bright lights',
     'Overactivity causing an excessive focus on internal thoughts, leading to mind-wandering',
     'Imbalance in dopamine signaling leading to random spikes of salience'],
    'B'),
  q('Which other two areas are mentioned as potentially involved in the salience network, but noted as "not strongly involved or specific"?',
    ['Dorsolateral prefrontal cortex and posterior parietal cortex',
     'Precuneus and medial prefrontal cortex',
     'Amygdala and ventral striatum',
     'Hippocampus and inferior parietal lobe'],
    'C'),
  q('How does age affect the functioning of the CEN, and at what age range does the "sweet spot" of optimal function occur?',
    ['CEN function consistently improves with age, peaking in late adulthood (60s-70s)',
     'CEN function is underdeveloped in childhood, develops until mid-20s, and then declines in geriatric patients, suggesting a "sweet spot" around young to middle adulthood',
     'CEN function declines linearly from birth, with no identifiable sweet spot',
     'CEN function is constant throughout adulthood, only affected by neurodegenerative diseases'],
    'B'),
  q('Which of the following is NOT listed as a way to dampen a hyperactive Default Mode Network?',
    ['Stimulant medications',
     'Mindfulness meditation',
     'Regular alcohol consumption',
     'CBT techniques targeting automatic thoughts'],
    'C'),
  q('Why is the DMN considered "not bad" and even essential, despite its association with psychiatric symptoms when overactive?',
    ['It is responsible for suppressing the Salience Network during states of high focus',
     'It allows for laser focus on every single task, increasing daily efficiency',
     'It is a useful, energetically efficient brain circuit that enables mundane tasks without high cognitive demand, and is associated with self-reflection, abstract reasoning, and creativity',
     'It is the sole network responsible for impulse control and emotional regulation'],
    'C'),
  q('How can one "see the symptoms of schizophrenia" relating to disorganized stimuli or a poor signal-to-noise ratio within the salience filter?',
    ['As the brain failing to produce enough dopamine, resulting in a lack of attention',
     'As the salience filter removing all stimuli, leading to a blank perception',
     'As irrelevant stimuli being interpreted as extremely relevant, and the salience filter failing to remove normal background stimuli',
     'As the brain constantly switching between the DMN and CEN, leading to confusion'],
    'C'),
  q('What specific aspects of CEN function does the Wisconsin Card Sorting Test (WCST) assess, and how does the participant learn the rules?',
    ['Attention regulation and impulse control; by explicit verbal instructions',
     'Working memory and problem-solving; by observing other participants',
     'Set shifting and cognitive flexibility; by receiving regular feedback (right or wrong) without direct instructions',
     'Goal orientation and self-regulation; by practicing with a pre-set list of rules'],
    'C'),
  q('Which network is more directly related to the negative and cognitive symptoms of schizophrenia, and which to the positive symptoms?',
    ['Negative/Cognitive: Default Mode Network; Positive: Central Executive Network',
     'Negative/Cognitive: Salience Network; Positive: Default Mode Network',
     'Negative/Cognitive: Central Executive Network; Positive: Salience Network',
     'Negative/Cognitive: Amygdala; Positive: Ventral Striatum'],
    'C'),
]);

addQuiz('ketamine-esketamine', 'Ketamine & Esketamine', 'Antidepressants', [
  q('The initial significant observation that led to ketamine\'s study for depression originated from:',
    ['Large-scale efficacy trials comparing ketamine to placebo in depressed patients',
     'Serendipitous findings of mood improvement in patients receiving ketamine as part of studies modeling cognitive deficits in schizophrenia',
     'Long-standing recognition of ketamine\'s mood-enhancing properties in anesthetic practice',
     'Early trials in the 1970s specifically designed to evaluate ketamine as a primary antidepressant'],
    'B'),
  q('Which of the following is NOT mentioned as a potential mechanism or target in ketamine\'s antidepressant "pleotrope concert effect"?',
    ['NMDA receptor antagonism',
     'AMPA receptor modulation',
     'Direct inhibition of serotonin and norepinephrine reuptake pumps',
     'Opioid receptor effects'],
    'C'),
  q('The controversial Williams et al. study using an opioid antagonist suggested that:',
    ['Opioid receptor activation is the sole mechanism of ketamine\'s antidepressant effect',
     'Opioid agonist effects may be a necessary, but not sufficient, component of ketamine\'s complex antidepressant action',
     'Blocking opioid receptors significantly enhances ketamine\'s antidepressant response',
     'The opioid system plays no role in ketamine\'s antidepressant mechanism'],
    'B'),
  q('What was the primary driver behind the development and pursuit of FDA approval for esketamine (Spravato) rather than racemic ketamine?',
    ['Empirical evidence from head-to-head trials showing superior efficacy of esketamine',
     'A more favorable side effect profile of esketamine, particularly less dissociation',
     'The ability to obtain intellectual property protection and a patent for esketamine, as racemic ketamine is off-patent',
     'Esketamine\'s higher affinity for NMDA receptors was definitively proven to be the sole reason for antidepressant effect'],
    'C'),
  q('Achieving a sustained antidepressant response with ketamine or esketamine typically requires:',
    ['A single, high-dose infusion followed by traditional oral antidepressants',
     'Daily oral administration of low-dose ketamine',
     'An initial series of treatments followed by regular booster or maintenance treatments',
     'Combining a single treatment with intensive, insight-oriented psychotherapy'],
    'C'),
  q('The Ketamine-Assisted Psychotherapy (KAT) model, aiming to use ketamine as a psychedelic catalyst for breakthroughs, currently:',
    ['Is strongly supported by randomized controlled trial data',
     'Is based on using lower, sub-dissociative doses of ketamine',
     'Lacks support from randomized controlled trials',
     'Is the standard approach for treating personality disorders'],
    'C'),
  q('The real-world effectiveness study regarding ketamine for bipolar depression found that:',
    ['Ketamine was less effective than for unipolar depression and had a high risk of manic switching',
     'Ketamine showed comparable effectiveness to unipolar depression with a low risk of serious side effects like manic switches when patients were on adequate mood stabilizers',
     'Ketamine was effective but frequently triggered psychotic episodes',
     'The study demonstrated that ketamine is ineffective for bipolar depression'],
    'B'),
  q('Which of the following is cited as a significant systemic barrier to accessing treatments like ketamine, esketamine, rTMS, and ECT?',
    ['Over-availability of trained clinicians to administer these treatments',
     'Patient preference for less intensive, oral medication options',
     'High cost, limited insurance coverage, stringent requirements for in-person visits, monitoring, and transportation',
     'Excessive patient demand overwhelming existing treatment capacity'],
    'C'),
  q('Regarding the efficacy of ketamine in older adults (over 65) compared to younger adults:',
    ['Efficacy appears to be comparable, with similar dose requirements',
     'Older adults seem to respond more robustly and quickly due to enhanced neuroplasticity',
     'Ketamine appears somewhat less effective in older adults, potentially requiring more doses, and studies have been less impressive',
     'Ketamine is contraindicated in older adults due to increased safety risks'],
    'C'),
  q('Comparing ketamine/esketamine to standard treatments for treatment-resistant depression based on recent NEJM studies:',
    ['Esketamine was found to be non-inferior to quetiapine augmentation, and ketamine was less effective than ECT',
     'Esketamine was found to be categorically more effective than quetiapine augmentation, and ketamine was non-inferior (and numerically superior in some metrics) to ECT',
     'Both esketamine and ketamine were shown to be inferior to both quetiapine and ECT',
     'Ketamine and esketamine have now completely replaced quetiapine and ECT as first-line treatments'],
    'B'),
]);

addQuiz('tcas', 'Tricyclic Antidepressants (TCAs)', 'Antidepressants', [
  q('The initial FDA-approved tricyclic antidepressant, imipramine, shares a structural similarity with which specific class of psychiatric medication?',
    ['Selective Serotonin Reuptake Inhibitors (SSRIs)',
     'Benzodiazepines',
     'Antipsychotics, specifically chlorpromazine',
     'Mood Stabilizers like valproic acid'],
    'C'),
  q('Which statement most accurately describes the pharmacological differences between secondary and tertiary amine TCAs?',
    ['Tertiary amines are generally more noradrenergic and have fewer side effects compared to secondary amines',
     'Secondary amines are generally more serotonergic and have more alpha 1 blockade compared to tertiary amines',
     'Tertiary amines are generally more serotonergic, have more alpha 1 blockade, and exhibit more anticholinergic activity relative to secondary amines, which are more noradrenergic and have fewer side effects',
     'Secondary amines are metabolites of tertiary amines, and this metabolic conversion increases anticholinergic activity'],
    'C'),
  q('Which combination of additional receptor binding sites is mentioned as contributing to the overall effects of TCAs beyond their SNRI action?',
    ['Dopamine D2, Muscarinic, and Histamine H1 receptors',
     'Histamine H1, Alpha 1 adrenergic, and Muscarinic receptors',
     'Serotonin 5-HT2A, Alpha 2 adrenergic, and GABA receptors',
     'NMDA glutamate, Nicotinic acetylcholine, and Beta adrenergic receptors'],
    'B'),
  q('What is the primary CYP enzyme family for TCA metabolism, and what is a significant clinical implication mentioned regarding drug interactions?',
    ['CYP3A4; concurrent use with strong inhibitors can decrease TCA levels',
     'CYP2C9; concurrent use with strong inducers can increase TCA levels',
     'CYP2D6; concurrent use with strong inhibitors like bupropion can significantly increase TCA blood levels, raising the risk of adverse effects',
     'CYP1A2; genetic polymorphisms significantly impact therapeutic range'],
    'C'),
  q('What is the primary mechanism by which TCA overdose causes lethality?',
    ['Excessive serotonin agonism leading to severe serotonin syndrome and hyperthermia',
     'Profound alpha 1 blockade causing intractable hypotension and shock',
     'Irreversible MAO inhibition leading to accumulation of monoamines and hypertensive crisis',
     'Blockade of sodium channels in the heart, preventing sodium influx, slowing depolarization, and leading to arrhythmias and death'],
    'D'),
  q('At what approximate plasma concentration range does severe toxicity and fatalities start to be regularly reported with TCAs?',
    ['Greater than 450 nanograms per milliliter',
     'Between 600 and 800 nanograms per milliliter',
     'Regularly reported at levels of 2,000 to 3,000 ng/mL, with severe toxicity starting as early as 1,000 ng/mL',
     'Any level exceeding the lower bound of the therapeutic range'],
    'C'),
  q('For which medical indications, other than depression or anxiety, is amitriptyline commonly prescribed at lower doses (25-50 mg/day)?',
    ['Insomnia and restless legs syndrome',
     'Migraines, fibromyalgia, and interstitial cystitis',
     'Essential tremor and generalized anxiety disorder',
     'Irritable bowel syndrome and chronic fatigue syndrome'],
    'B'),
  q('What unique feature does clomipramine (Anafranil) have among TCAs, and what is its associated FDA approval?',
    ['It is the most noradrenergic TCA and is FDA approved for panic disorder',
     'It has the lowest anticholinergic burden and is FDA approved for neuropathic pain',
     'It is structurally similar to amphetamine and is FDA approved for treatment-resistant depression',
     'It is the most serotonergic TCA and is FDA approved for obsessive-compulsive disorder (OCD)'],
    'D'),
  q('Beyond depression and anxiety, what specific condition is imipramine (Tofranil) noted for treating, sometimes tested on board exams?',
    ['Social anxiety disorder in adults',
     'Attention-deficit/hyperactivity disorder (ADHD) in adolescents',
     'Nocturnal enuresis (bedwetting) in children',
     'Separation anxiety disorder in children'],
    'C'),
  q('Which TCA is specifically recommended more often among psychiatrists for mood disorders, and what are its advantages?',
    ['Desipramine; due to being the most noradrenergic and having the lowest risk of weight gain',
     'Desipramine; due to having the lowest anticholinergic burden and being more effective for severe depression',
     'Nortriptyline; due to having the lowest anticholinergic burden and being more activating',
     'Nortriptyline; due to having the lowest risk of orthostasis and weight gain among the TCAs'],
    'D'),
]);

addQuiz('maois', 'MAOIs (Monoamine Oxidase Inhibitors)', 'Antidepressants', [
  q('Which statement most accurately describes the primary mechanism by which classic MAOIs exert their effect?',
    ['They primarily block the re-uptake of norepinephrine and serotonin at the synaptic cleft',
     'By inhibiting MAO-B with high selectivity, they cause a significant increase in synaptic dopamine levels',
     'They inhibit the enzyme GABA transaminase, leading to enhanced GABAergic activity',
     'They non-selectively inhibit both MAO-A and MAO-B enzymes, preventing the enzymatic breakdown of norepinephrine, serotonin, and dopamine'],
    'D'),
  q('What was the first MAOI medication to receive FDA approval?',
    ['Phenelzine', 'Tranylcypromine', 'Iproniazid', 'Selegiline'],
    'C'),
  q('Which MAO enzyme is primarily responsible for the breakdown of norepinephrine and serotonin?',
    ['MAO-A', 'MAO-B1', 'Both equally', 'Neither'],
    'A'),
  q('Which significant potential side effect is highlighted as a primary reason limiting the current widespread use of MAOIs?',
    ['Significant weight gain',
     'Less gastrointestinal side effects compared to SSRIs',
     'Orthostatic hypotension',
     'Serotonin syndrome'],
    'C'),
  q('The hypertensive crisis "cheese reaction" with MAOIs is primarily due to increased levels of which substance?',
    ['Serotonin', 'Norepinephrine', 'Tyramine', 'Dopamine'],
    'C'),
  q('Which statement accurately describes a specific characteristic of one of the mentioned MAOIs?',
    ['Phenelzine is considered the more activating of the MAOIs discussed',
     'The transdermal selegiline patch (Emsam) at lower doses selectively inhibits MAO-A',
     'Tranylcypromine is chemically similar to amphetamine and uniquely inhibits GABA transaminase',
     'Phenelzine is described as more calming and is also an inhibitor of GABA transaminase, theoretically enhancing GABA receptor action'],
    'D'),
  q('When switching from an SSRI (excluding fluoxetine) to an MAOI, the recommended washout period is typically:',
    ['A few days', '1 to 2 weeks', '6 weeks', '24 hours'],
    'B'),
  q('Which statement most accurately describes MAOIs\' general position within the current sequential treatment approach for major depressive disorder?',
    ['MAOIs are now primarily reserved as second-line agents for patients with atypical depression who have failed a single SSRI trial',
     'Despite evidence suggesting potentially larger effect sizes, the significant risks lead to MAOIs being generally recommended as third or fourth line treatments for treatment-resistant depression',
     'The transdermal selegiline patch is considered a potential first or second line option due to MAO-B selectivity',
     'MAOIs are primarily used for melancholic depression, considered third-line after TCAs'],
    'B'),
  q('Which statement most accurately describes typical dosing for Phenelzine (Nardil)?',
    ['Starting 10 mg once or twice daily, target 30-60 mg/day, rapid titration advised',
     'Starting 15 mg one to three times per day, target 45-90 mg/day, titrate slower than SSRIs due to orthostatic hypotension risk',
     'Starting 6 mg/day transdermal patch, target up to 12 mg/day',
     'Starting 30 mg/day in divided doses, target 90-150 mg/day'],
    'B'),
  q('Which statement accurately reflects the relationship between selegiline patch (Emsam) dose, frequency, and enzyme selectivity?',
    ['Starting dose 10 mg/day, administered twice daily, maintains high selectivity for MAO-A',
     'Starting dose 6 mg/day, applied once daily; increasing above 8 mg/day reduces its selectivity for MAO-B, leading to increased inhibition of MAO-A',
     'Doses range from 30-60 mg/day, given once daily, targeting both MAO-A and MAO-B',
     'Started at 15 mg/day once daily, considered MAO-A selective'],
    'B'),
]);

addQuiz('loxapine', 'Loxapine', 'Antipsychotics', [
  q('According to the podcast, Loxapine is classified as a:',
    ['Typical antipsychotic with minimal atypical properties',
     'Typical antipsychotic, although it possesses some atypical properties based on its receptor binding profile',
     'Primarily atypical antipsychotic despite its age',
     'Tetracyclic antidepressant with antipsychotic effects'],
    'B'),
  q('Which statement is TRUE regarding Loxapine\'s binding profile compared to D2 receptors?',
    ['It has greater D2 affinity than 5HT2A affinity',
     'Its D2 affinity is similar to its 5HT2A affinity',
     'It has greater 5HT2A affinity than D2 affinity',
     'It primarily binds to muscarinic receptors'],
    'C'),
  q('Loxapine is chemically most similar in structure to which other antipsychotic?',
    ['Olanzapine', 'Haloperidol', 'Risperidone', 'Clozapine'],
    'D'),
  q('What is the notable active metabolite of Loxapine, and what class does it belong to?',
    ['Norclozapine; Atypical antipsychotic',
     'Lis-doxapine; Typical antipsychotic',
     'Risperidone; Atypical antipsychotic',
     'Amoxapine; Tetracyclic antidepressant'],
    'D'),
  q('The primary FDA-approved indication for Loxapine oral formulation is:',
    ['Acute mania associated with bipolar I disorder',
     'Treatment-resistant depression',
     'Schizophrenia',
     'Agitation associated with schizophrenia or bipolar I disorder'],
    'C'),
  q('Which unique formulation of Loxapine is the only inhaled antipsychotic currently available?',
    ['Short-acting intramuscular injection',
     'Oral liquid',
     'Oral capsule',
     'Inhalation powder (Adasuve)'],
    'D'),
  q('Which potential risk is associated with Loxapine specifically due to its active metabolite, particularly in overdose?',
    ['Agranulocytosis',
     'Significant weight gain',
     'Increased cardiotoxicity risk',
     'Severe extrapyramidal symptoms at therapeutic doses'],
    'C'),
  q('Which reason is specifically mentioned as contributing to Loxapine\'s lack of widespread use, related to its market history?',
    ['High risk of agranulocytosis, similar to Clozapine',
     'Its patent expired around the same time Clozapine received US FDA approval, reducing financial incentive for promotion',
     'Severe side effect profile compared to newer atypical antipsychotics',
     'Lack of demonstrated efficacy in any clinical trials'],
    'B'),
  q('Compared to Clozapine, Loxapine is described as having a better tolerability profile in terms of:',
    ['Lower risk of extrapyramidal symptoms',
     'Milder weight gain and less sedation',
     'Higher seizure threshold',
     'Stronger efficacy for positive symptoms'],
    'B'),
  q('Based on the case example, Loxapine was used successfully in a patient with severe treatment-resistant:',
    ['Schizophrenia without psychotic features',
     'Major Depressive Disorder with psychotic features',
     'Generalized Anxiety Disorder',
     'Bipolar I disorder with psychotic features'],
    'B'),
]);

addQuiz('antipsychotic-weight-gain', 'Antipsychotic Weight Gain Mitigation', 'Antipsychotics', [
  q('What is identified as the primary factor accounting for shortened lifespan in patients with schizophrenia?',
    ['Increased risk of accidental injuries',
     'Higher rates of suicide',
     'Cardiovascular mortality',
     'Respiratory complications'],
    'C'),
  q('What was the reported prevalence of metabolic syndrome among patients with schizophrenia (Mitchell et al.)?',
    ['10.5%', '21.0%', '32.5%', '45.0%'],
    'C'),
  q('Which neurobiological mechanism is primarily thought to mediate antipsychotic-induced weight gain by increasing appetite?',
    ['Agonism of 5HT2C receptors',
     'Agonism of Histamine H1 receptors',
     'Agonism of Dopamine D2 receptors',
     'Antagonism of 5HT2C receptors'],
    'D'),
  q('Which antipsychotic is considered "high risk" for weight gain, with approximately 30% or more patients likely gaining over 7% of baseline weight?',
    ['Aripiprazole (Abilify)',
     'Risperidone (Risperdal)',
     'Quetiapine (Seroquel)',
     'Olanzapine (Zyprexa)'],
    'D'),
  q('According to a Cochrane review, switching from olanzapine to aripiprazole or quetiapine resulted in a mean weight loss of approximately:',
    ['0.5 kg (1.1 lbs)', '1.0 kg (2.2 lbs)', '1.94 kg (4.3 lbs)', '3.5 kg (7.7 lbs)'],
    'C'),
  q('Adjunctive metformin therapy (500-2000 mg/day) was associated with a mean weight reduction of approximately:',
    ['1.5 kg (3.3 lbs)', '2.1 kg (4.6 lbs)', '3.17 kg (6.89 lbs)', '5.3 kg (11.7 lbs)'],
    'C'),
  q('For high-risk weight gain antipsychotics, what is the primary recommendation regarding metformin (Carolon et al. 2024)?',
    ['Initiate metformin if certain other risk factors are met',
     'Commence metformin immediately',
     'Consider metformin only if weight gain has already occurred',
     'Metformin is generally not recommended for high-risk antipsychotics'],
    'B'),
  q('Which side effect is NOT specifically attributed to topiramate itself, but rather mentioned in the context of its combination with phentermine?',
    ['Renal stones',
     'Dose-dependent cognitive impairments',
     'Potential for new onset psychosis',
     'Reduced efficacy of hormonal contraceptives'],
    'C'),
  q('What is identified as a major barrier to widespread use of GLP-1 receptor agonists for weight loss?',
    ['Requirement for daily oral administration',
     'High incidence of severe cardiovascular adverse events',
     'Potential for thyroid C-cell tumors',
     'High cost and insurance coverage limitations'],
    'D'),
  q('What was the finding regarding non-pharmacological interventions (CBT and nutritional counseling) for antipsychotic-induced weight gain?',
    ['No significant difference in weight reduction was observed',
     'A statistically significant reduction in mean body weight was observed',
     'Non-pharmacological interventions were found to be less effective than pharmacological options',
     'Only individual therapy, not group therapy, showed significant weight loss'],
    'B'),
]);

// Continue in the generation script - I'll add all remaining quizzes
// This is getting very long, so let me write the remaining data more compactly

addQuiz('clozapine', 'Clozapine', 'Antipsychotics', [
  q('What year was clozapine first synthesized?', ['1988','1989','1958','1970s'], 'C'),
  q('What major problem arose that caused uncertainty about clozapine\'s status?', ['High rates of sedation and weight gain','Lack of demonstrated efficacy','Reports of significant cardiac side effects','Propensity for causing agranulocytosis, leading to deaths'], 'D'),
  q('Dr. John Kane\'s 1988 paper compared clozapine double-blind with which drug?', ['Haloperidol','Risperidone','Chlorpromazine','Olanzapine'], 'C'),
  q('The FDA indicated they would consider approval if clozapine was shown superior in which population?', ['First-episode psychosis','Acute exacerbations','Treatment-resistant patients','Predominant negative symptoms'], 'C'),
  q('What is the approximate death rate associated with severe neutropenia caused by clozapine?', ['0.4%','0.04%','0.5%','0.05%'], 'B'),
  q('What percentage of first-episode schizophrenia patients are estimated to be treatment resistant?', ['40%','1 out of 8 patients','20%','About half of patients'], 'C'),
  q('What finding regarding mortality rates among schizophrenia patients treated with clozapine is true?', ['Clozapine has the highest mortality rate','Clozapine has mortality rates similar to other antipsychotics','Mortality rates among patients receiving clozapine are significantly lower than those receiving other medications','Mortality rates are only lower in the first year'], 'C'),
  q('What proportion of U.S. patients who are candidates for clozapine are not receiving one?', ['Half','One out of every two','One out of every four','One out of every eight'], 'C'),
  q('Besides treatment resistance, what other FDA-approved indication for clozapine is mentioned?', ['Bipolar disorder','Aggressive and violent behavior','Prevention of relapse','Reduction of suicidality'], 'D'),
  q('The FDA advisory committee voted 14 to 1 in favor of recommending what regarding the REMS program?', ['Strengthening the monitoring requirements','Maintaining the program in its current form','Extending the duration of weekly monitoring','Recommending that the REMS program no longer be a requirement'], 'D'),
]);

addQuiz('h1-agonists-sleep', 'H1 Antagonists for Sleep', 'Sleep Medications', [
  q('Which neurobiological mechanism is primarily responsible for the sedative effects of histamine H1 receptor antagonists?', ['Increased histamine activity at H1 receptors in the hypothalamus','Inhibition of dopamine reuptake in the mesolimbic pathway','Blockade of histamine activity at H1 receptors, leading to decreased wakefulness','Agonism of GABA-A receptors, enhancing inhibitory neurotransmission'], 'C'),
  q('What was the key finding regarding the long-term efficacy of trazodone for sleep in the largest trial?', ['It showed sustained efficacy for several months','It was effective for up to one week but then showed no significant difference from placebo','It demonstrated superior sleep quality compared to other H1 antagonists','It improved sleep efficiency significantly only at antidepressant-range doses'], 'B'),
  q('To maximize mirtazapine\'s hypnotic effect with minimal activating properties, what dosing is recommended?', ['15-30 mg, as higher doses are more sedating','Not to exceed 15 mg per night, as higher doses may become activating','30-60 mg, to achieve full antidepressant and sedative effects','It does not matter, as its hypnotic effect is consistent across all doses'], 'B'),
  q('Which H1 receptor antagonist is explicitly recommended to be avoided in the elderly due to high anticholinergic properties?', ['Trazodone','Hydroxyzine','Doxepin at low doses (3-6 mg)','Diphenhydramine'], 'D'),
  q('Which H1 receptor antagonist is the only one in this class FDA approved for insomnia treatment?', ['Trazodone','Mirtazapine','Doxepin','Hydroxyzine'], 'C'),
  q('At extremely low doses (3-6 mg) where doxepin is FDA-approved for insomnia, its action is primarily:',['Significant modulation of norepinephrine and serotonin','Purely selective antihistaminergic activity with minimal anticholinergic or cardiotoxic effects','Potent alpha-1 adrenergic blockade','Broad-spectrum antagonism across multiple receptor types'],'B'),
  q('A notable finding regarding low-dose doxepin\'s efficacy for sleep was its ability to demonstrate:', ['Equivalence to placebo after two weeks','Persistent benefit only when combined with CBTI','Sustained improvement in sleep parameters, showing noticeable separation from placebo even at 85 days','Significant improvement in sleep architecture, including increased REM sleep'], 'C'),
  q('What is the primary cautionary recommendation regarding sedating antipsychotics like quetiapine off-label for insomnia?', ['Generally recommended due to strong H1 antagonism','Should generally be avoided due to risks like significant weight gain and metabolic dysfunction, even at low doses','Safe for long-term use in sleep apnea patients','Should only be used in patients with comorbid substance use disorders'], 'B'),
  q('What pharmacokinetic consideration is important when prescribing doxepin regarding drug interactions?', ['Primarily metabolized by CYP3A4','Undergoes first-pass metabolism, requiring parenteral administration','Goes through CYP2D6 pathway; strong inhibitors (e.g., fluoxetine) can significantly increase plasma levels','Primarily excreted renally'], 'C'),
  q('A male patient on trazodone reports a prolonged erection without sexual stimulation. What is the appropriate advice?', ['Benign side effect that typically resolves within 24 hours','A medical emergency requiring immediate ER evaluation','Indicates a need to increase the dose','A common, non-urgent side effect manageable with OTC pain relievers'], 'B'),
]);

addQuiz('lumateperone', 'Lumateperone (Caplyta)', 'Antipsychotics', [
  q('What is the specific and unique dual action lumateperone has at the D2 receptor?', ['Primarily a post-synaptic D2 partial agonist and pre-synaptic antagonist','A post-synaptic D2 inverse agonist and pre-synaptic full agonist','Functions as both a post-synaptic D2 antagonist and a pre-synaptic D2 partial agonist','Acts as a selective D2 receptor modulator, affecting only the G-protein coupled subset'], 'C'),
  q('Which is NOT one of the theories proposed to explain lumateperone\'s efficacy at only 39% D2 occupancy?', ['Its strong binding at 5HT2A receptors may compensate for lower D2 occupancy','Its actions on glutamate modulation, similar to clozapine, contribute to efficacy','Its pre-synaptic D2 partial agonism helps stabilize dopamine levels','Its rapid dissociation from the D2 receptor allows for transient but effective blockade at lower occupancy levels'], 'D'),
  q('What is a unique dosing characteristic of lumateperone?', ['Requires a slow titration over several weeks','A single starting dose of 42 mg is generally the starting and target dose','Must be adjusted based on BMI','Typically dosed twice daily due to short half-life'], 'B'),
  q('Which side effect had rates not significantly higher than placebo for lumateperone?', ['QTC prolongation','Prolactin elevation','Akathisia','Significant weight gain'], 'C'),
  q('What is the primary clinical implication of lumateperone acting as a weak SSRI?', ['Significantly reduces the need for adjunctive antidepressant therapy','Enables use as first-line monotherapy for MDD','Carries a potential risk of serotonin syndrome when combined with other serotonin-elevating agents','Leads to higher incidence of GI side effects'], 'C'),
  q('What was the post-hoc analysis finding regarding lumateperone\'s effect size in bipolar 1 vs bipolar 2 depression?', ['Bipolar 1 (0.81) was stronger than bipolar 2 (0.49)','Bipolar 2 (0.81) was notably stronger than bipolar 1 (0.49)','Effect sizes were identical (0.67)','Only effective for bipolar 1'], 'B'),
  q('What is the most significant practical limitation to lumateperone\'s widespread use?', ['Extensive and frequent laboratory monitoring','High monthly cost and limited insurance coverage or hospital formulary availability','A significantly longer half-life requiring complex dosing adjustments','Higher propensity for severe cardiovascular events'], 'B'),
  q('For which hepatic impairment status does the FDA recommend a reduced dose of 21 mg?', ['Only severe hepatic impairment','Mild to moderate hepatic impairment','Moderate or severe hepatic impairment','Any degree of hepatic impairment'], 'C'),
  q('For which phase of bipolar illness is lumateperone currently FDA approved?', ['Both manic and depressive phases','Only the manic phase','Only the depressive phase','Mixed features only'], 'C'),
  q('While lumateperone is primarily metabolized via CYP3A4, what minor metabolic contribution was deemed clinically insignificant?', ['CYP2D6','UGT (Uridine Glucuronosyltransferase)','CYP2C19','Esterase enzymes'], 'B'),
]);

addQuiz('cariprazine', 'Cariprazine (Vraylar)', 'Antipsychotics', [
  q('Cariprazine\'s distinguishing receptor profile among dopamine partial agonists is its:', ['Strongest affinity and partial agonism at D2 receptors compared to D3','Strong antagonism at 5-HT2C receptors vs 5-HT1C receptors','Markedly higher affinity/partial agonism at D3 receptors vs D2 receptors','Exclusive activity at dopamine transporter'], 'C'),
  q('Which FDA approval does cariprazine NOT hold?', ['Schizophrenia','Major Depressive disorder monotherapy','Acute Manic or Mixed Episode in bipolar 1 disorder','Maintenance treatment of bipolar 1 disorder'], 'B'),
  q('Cariprazine is primarily metabolized by:', ['CYP2D6','CYP3A4','Renal excretion unchanged','CYP1A2'], 'B'),
  q('For bipolar depression, the generally targeted dose is:', ['4.5-6 mg/day','1.5-3 mg/day','6-9 mg/day','Dose not adjusted by indication'], 'B'),
  q('Which statement about cariprazine\'s half-life and active metabolite is correct?', ['Very short half-life (<24 hours) and no active metabolite','Half-life is ~2-4 days, plus an active metabolite (desmethyl-cariprazine) with ~1-3 weeks half-life','Given weekly due to a 7-day half-life','Half-life is ~12 hours; metabolized to inactive compounds'], 'B'),
  q('Cariprazine is notable for relatively low metabolic risk and sedation, but highest risk within its class for:', ['Significant weight gain','Severe QTc prolongation','Akathisia','Anticholinergic delirium'], 'C'),
  q('Studies indicated possible increased risk with cariprazine for which impulsive/compulsive behaviors?', ['Improved impulse control in all patients','Pathological gambling, excessive spending/eating, hypersexuality','Decreased reward-seeking behaviors','Exclusive risk of compulsive exercise'], 'B'),
  q('In the head-to-head trial comparing cariprazine vs risperidone for negative symptoms over 26 weeks:', ['No difference between groups','Both improved, but cariprazine produced significantly greater reduction vs risperidone','Risperidone outperformed cariprazine significantly','Neither drug improved negative symptoms compared to placebo'], 'B'),
  q('Which factor limits widespread use of cariprazine?', ['Low cost but no efficacy','High monthly cost (>$1,000), modest effect sizes, and marketing influences','Universal lack of FDA approvals','Mandatory injectable formulation only'], 'B'),
  q('The clinical niche where cariprazine may be particularly considered is:', ['First-line for all psychotic disorders','Exclusively for sedation in acute agitation','Predominant negative symptoms or anhedonia in schizophrenia','Only for treatment-resistant depression without psychotic features'], 'C'),
]);

addQuiz('rexulti', 'Brexpiprazole (Rexulti)', 'Antipsychotics', [
  q('Which neurobiological mechanism is a key differentiating factor where brexpiprazole exhibits substantially higher antagonism compared to aripiprazole?', ['D2 receptor partial agonism','5HT1A receptor partial agonism','5HT2A receptor antagonism','Alpha 1 adrenergic receptor antagonism'], 'C'),
  q('How much longer is brexpiprazole\'s half-life compared to aripiprazole\'s?', ['5-10 hours','15-16 hours','20-25 hours','30-35 hours'], 'B'),
  q('Which statement accurately reflects findings from the pivotal study or subsequent report on brexpiprazole for agitation in Alzheimer\'s dementia?', ['Brexpiprazole was significantly more effective than placebo in acute as-needed agitation','The BMJ report claimed an effect size of 0.85, leading to questions about clinical significance','Patients taking brexpiprazole experienced a four-fold higher risk of death compared to placebo','The controversy focused on sedating effects being too high for elderly population'], 'C'),
  q('Which study attempted to address the potential risk of impulse control problems for both brexpiprazole and cariprazine?', ['Alveras et al. 2021','Mizuno et al. 2021','Zazu et al. 2021','Carolon et al. 2024'], 'C'),
  q('For which diagnosis has Rexulti failed several trials?', ['Borderline Personality Disorder','Post-Traumatic Stress Disorder','Acute Mania','Agitation in Alzheimer\'s Disease Dementia'], 'C'),
  q('Which statement accurately describes brexpiprazole\'s tolerability profile?', ['Slightly higher risk of QTC prolongation but lower anticholinergic effects','Generally less sedating and lower risk of akathisia, although slightly higher risk of weight gain','Higher risk of extrapyramidal side effects such as dystonia compared to aripiprazole','Considered metabolically superior to aripiprazole, especially concerning weight gain'], 'B'),
  q('Brexpiprazole is marketed as the only SGA with high binding affinity to which combination of receptors?', ['Serotonin, Dopamine, and Acetylcholine','Dopamine, Norepinephrine, and Histamine','Serotonin, Dopamine, and Norepinephrine','Serotonin, Dopamine, and Glutamate'], 'C'),
  q('Regarding brexpiprazole for agitation in Alzheimer\'s dementia, what clinical guidance is provided?', ['Primarily for use as an acute PRN medication','Expected to provide rapid calming effects','Meant to decrease baseline agitation and not available in short-acting IM formulations, reinforcing non-acute use','Can be safely used in elderly without any black box warnings'], 'C'),
  q('What is the FDA maximum daily dose for brexpiprazole?', ['2 mg/day','3 mg/day','4 mg/day','6 mg/day'], 'C'),
  q('What is a significant practical barrier to brexpiprazole\'s widespread use compared to aripiprazole?', ['Requirement for frequent laboratory monitoring','The absence of any generic formulations, leading to high monthly cost','Higher incidence of severe cardiovascular side effects','Its narrow therapeutic window'], 'B'),
]);

addQuiz('abilify', 'Aripiprazole (Abilify)', 'Antipsychotics', [
  q('Which correctly describes aripiprazole\'s primary mechanism of action?', ['Strong D2 receptor antagonist and 5HT2A receptor antagonist','Partial agonist at dopamine 2 (D2) and serotonin 1A (5HT1A) receptors','Selective serotonin reuptake inhibitor with some D2 antagonism','Norepinephrine-dopamine reuptake inhibitor with 5HT1A agonism'], 'B'),
  q('Which is listed as an FDA-approved indication for aripiprazole in patients 10 years and older?', ['Major Depressive Disorder (monotherapy)','Bipolar I Depression','Acute Mania','Generalized Anxiety Disorder'], 'C'),
  q('What is the approximate half-life of aripiprazole?', ['24 hours','48 hours','75 hours','120 hours'], 'C'),
  q('A potential advantage of aripiprazole\'s long half-life is:', ['Faster time to steady state','Lower risk of withdrawal side effects if a dose is missed','More rapid wash-out if not tolerated','Reduced need for therapeutic drug monitoring'], 'B'),
  q('For unipolar depression adjunct, the target dose of oral aripiprazole should typically not exceed:', ['5 mg/day','10 mg/day','20 mg/day','30 mg/day'], 'B'),
  q('What is one of the most common side effects of aripiprazole, noted as dose-dependent?', ['Significant QTc prolongation','Weight gain','Sedation','Akathisia'], 'D'),
  q('Aripiprazole carries an FDA blackbox warning in elderly patients for:', ['Increased risk of metabolic syndrome','Increased risk of CVAs and death','Increased risk of tardive dyskinesia','Increased risk of severe dermatological reactions'], 'B'),
  q('The FDA issued a warning in 2016 regarding a potential association between aripiprazole and:', ['Agranulocytosis','Neuroleptic Malignant Syndrome','Impulse control disorders','Orthostatic hypotension'], 'C'),
  q('Which LAI formulation of aripiprazole is a 4-week injection with doses of 300 mg and 400 mg?', ['Aristada (aripiprazole lauroxil)','Abilify Maintena (aripiprazole monohydrate)','Aristada Initio','Abilify Asimtufii'], 'B'),
  q('A 2019 systematic review in The Lancet found aripiprazole\'s effect size for schizophrenia was:', ['Significantly superior to non-clozapine antipsychotics','Roughly average compared to other antipsychotics','A little bit below average, especially for positive symptoms','Not evaluated in the systematic review'], 'C'),
]);

addQuiz('seroquel', 'Quetiapine (Seroquel)', 'Antipsychotics', [
  q('Which statement about quetiapine\'s prescription patterns in the US is correct?', ['Primarily prescribed for schizophrenia','Less commonly prescribed overall','The most commonly prescribed antipsychotic but prescribed more for mood disorders than psychosis','Typically reserved for treatment-resistant psychotic disorders'], 'C'),
  q('Which phase is NOT mentioned as having FDA approval for quetiapine?', ['Acute mania','Bipolar maintenance','Bipolar depression','Bipolar mixed features'], 'D'),
  q('What is the primary action of norquetiapine that may contribute to quetiapine\'s efficacy in mood disorders?', ['Potent D2 receptor blockade','Strong H1 antagonism','Alpha-1 antagonism','Norepinephrine re-uptake inhibition (SNRI-like effect)'], 'D'),
  q('Once-daily dosing of quetiapine can be advantageous because:', ['Reduces orthostatic hypotension risk','Leads to higher peak plasma concentrations','Can help manage sedation if taken at bedtime','Is necessary due to the long half-life'], 'C'),
  q('Quetiapine is primarily metabolized by which CYP enzyme?', ['CYP1A2','CYP2D6','CYP3A4','CYP2C19'], 'C'),
  q('The "Goldilocks phenomenon" — for which indication is quetiapine typically used at high doses (400-800 mg/day)?', ['Delirium','Bipolar depression','Sleep','Acute mania'], 'D'),
  q('What is given as a potential reason for quetiapine\'s lower EPS risk?', ['Shorter half-life','Primarily affects serotonin receptors','A poor D2 blocker with built-in anticholinergic effects','Rapidly metabolized by CYP3A4'], 'C'),
  q('What is highlighted as a significant risk of quetiapine in older adults?', ['Significant QTc prolongation','High risk of cataracts','Orthostatic hypotension and falls','Severe weight gain compared to other antipsychotics'], 'C'),
  q('Why did the FDA reject quetiapine\'s application for the GAD indication?', ['Lack of demonstrated efficacy','Concerns due to the side effect burden','Less effective than benzodiazepines','Insufficient data in the application'], 'B'),
  q('Which is NOT a potential street name for quetiapine?', ['Sera','Q-ball','Sue','Quellotine'], 'D'),
]);

addQuiz('eps', 'Extrapyramidal Symptoms (EPS)', 'Side Effects', [
  q('What are EPS primarily described as in the context of antipsychotic medication?', ['Disorders of voluntary motor control','Side effects related to serotonin reuptake','Iatrogenic disorders of involuntary movement caused by dopamine blocking agents','Symptoms directly related to the pyramidal tracts'], 'C'),
  q('What is generally the first consideration in managing any EPS?', ['Initiating an anticholinergic medication prophylactically','Removal of the causative agent, dose decrease, or switching to an agent less likely to cause EPS','Immediate consultation with a neurologist','Adding a beta-blocker'], 'B'),
  q('Which symptom is a cardinal sign of antipsychotic-induced Parkinsonism and typically presents bilaterally?', ['Sustained muscular contractions','An intense compulsion to move','Oral facial grimacing and lip smacking','Tremors, along with rigidity and bradykinesia'], 'D'),
  q('A life-threatening acute dystonic reaction should be treated immediately with:', ['Oral diphenhydramine','IV lorazepam','Intramuscular benztropine','VMAT2 inhibitors'], 'C'),
  q('Which best describes the primary manifestation of akathisia?', ['Involuntary upward deviation of the eyes and rigid arched back','Bilateral rigidity, shuffling gait, and bradykinesia','An inability to sit still, restlessness, pacing, and an intense compulsion to move','Oral facial dyskinesias such as grimacing, lip smacking, and tongue writhing'], 'C'),
  q('Which class of medication is generally NOT effective for akathisia?', ['Beta-blockers','Mirtazapine','Vitamin B6','Anticholinergics'], 'D'),
  q('What test is commonly used to screen for and monitor tardive dyskinesia?', ['Barnes Akathisia Rating Scale (BARS)','Parkinsonism Rating Scale (PRS)','Glimphatic System Function Test','Abnormal Involuntary Movement Scale (AIMS)'], 'D'),
  q('The pathophysiology of tardive dyskinesia is primarily linked to what compensatory mechanism?', ['A sudden drop in endogenous dopamine signaling','Upregulation and hypersensitivity of dopamine receptors','An imbalance between noradrenergic and dopaminergic transmission','Increased dopamine packaging into presynaptic vesicles'], 'B'),
  q('Which two FDA-approved medications treat tardive dyskinesia, both functioning as VMAT2 inhibitors?', ['Benztropine and Diphenhydramine','Propranolol and Mirtazapine','Amantadine and Vitamin E','Valbenazine and Deutetrabenazine'], 'D'),
  q('Acute dystonic reactions are more commonly associated with which patient demographic?', ['Elderly females','Obese adults','Young ethnic males','Individuals with intellectual disability'], 'C'),
]);

addQuiz('symbyax', 'Symbyax (Olanzapine + Fluoxetine)', 'Antipsychotics', [
  q('What is Symbyax?', ['An antidepressant medication','A combination medication of olanzapine and fluoxetine','A mood stabilizer','An antipsychotic monotherapy'], 'B'),
  q('For what specific indication is Symbyax FDA approved?', ['Treatment-resistant depression','Bipolar II depression','Mania in Bipolar I disorder','Bipolar I disorder in the depressive phase'], 'D'),
  q('Which is generally recommended against for bipolar depression?', ['Combining a mood stabilizer and an antidepressant','Using an antipsychotic with an antidepressant','Using quetiapine','Antidepressant monotherapy'], 'D'),
  q('What potential mechanism involving the 5HT2C receptor might explain the efficacy of combining olanzapine and fluoxetine?', ['High antagonism at the 5HT2C receptor','Agonism at the 5HT2C receptor','Partial agonism at the 5HT2C receptor','Inhibition of 5HT2C receptor expression'], 'A'),
  q('What metabolic effect was significantly increased in the olanzapine and OFC groups compared to placebo?', ['Decreased HDL cholesterol','Elevated triglycerides','Higher non-fasting glucose levels','Lower fasting insulin'], 'B'),
  q('How did weight gain in the OFC group compare to the olanzapine monotherapy group?', ['OFC group had significantly more','Olanzapine monotherapy group had significantly more','Only observed in the OFC group','No significant difference between the two groups'], 'D'),
  q('In the Towen et al. 2003 study, the OFC group showed improvement on all MADRS items except:', ['Apparent Sadness','Reduced Sleep','Inner Tension','Concentration Difficulties'], 'B'),
  q('Which FDA-approved treatment for bipolar depression is often preferred over OFC due to better metabolic profile?', ['Quetiapine','Lithium','Lamotrigine','Lurasidone'], 'D'),
  q('What is strongly recommended against for bipolar depression treatment?', ['Combining an antipsychotic with an antidepressant','Using mood stabilizers','Antidepressant monotherapy','Using generic medications'], 'C'),
  q('What practical reason often leads clinicians to prescribe generic olanzapine and fluoxetine as separate pills?', ['Ability to use higher doses of fluoxetine','Cost and accessibility issues with the branded combination pill','Superior efficacy of the generic combination','The need to avoid weight gain by separating the medications'], 'B'),
]);

addQuiz('zyprexa', 'Olanzapine (Zyprexa)', 'Antipsychotics', [
  q('Compared to first-generation antipsychotics, "-pine" antipsychotics like olanzapine generally have:', ['Higher dopamine blockade and lower antihistaminic actions','Higher rates of EPS and less metabolic dysfunction','Lower dopamine blockade and higher antihistaminic and anticholinergic actions','Lower rates of sedation and anticholinergic side effects'], 'C'),
  q('Which is NOT an FDA-approved indication for olanzapine alone?', ['Schizophrenia','Acute mania','Behavioral disturbances in dementia','Bipolar maintenance'], 'C'),
  q('Olanzapine first received FDA approval in which year?', ['2023','1990','1996','2006'], 'C'),
  q('The Zydis ODT formulation was found to reach the bloodstream on average approximately:', ['30 minutes after ingestion','10 minutes after ingestion','3.5 hours after ingestion','15 to 45 minutes after ingestion'], 'D'),
  q('Olanzapine is largely metabolized by which enzyme?', ['CYP 2D6','CYP 3A4','CYP 1A2','CYP 2C19'], 'C'),
  q('The FDA maximum dose for olanzapine in adults for mania or psychosis is:', ['10 mg/day','25 mg/day','20 mg/day','30 mg/day'], 'C'),
  q('Which side effect is olanzapine most notoriously associated with?', ['Extrapyramidal symptoms','QTc prolongation','Orthostatic hypotension','Weight gain and metabolic dysfunction'], 'D'),
  q('The CATIE trial found that olanzapine:', ['Had the lowest rate of discontinuation','Had the lowest side effect burden','Was the medication patients stayed on the longest, despite having the highest side effect burden','Was dosed at an average of 10 mg/day'], 'C'),
  q('Why is olanzapine pamoate (Relprevv) LAI rarely used?', ['Requires daily administration','Low efficacy compared to oral','Risk of Post-injection Delirium Sedation Syndrome (PDSS), requiring mandated monitoring','Significantly more weight gain than oral'], 'C'),
  q('Samidorphan in Lybalvi (olanzapine + samidorphan) is described as:', ['A dopamine agonist','A selective serotonin reuptake inhibitor','An opioid antagonist, similar to naltrexone','A CYP 1A2 inhibitor'], 'C'),
]);

addQuiz('si-prevention', 'Suicide Prevention', 'Clinical Topics', [
  q('Which key activity of the AFSP is highlighted?', ['Directly operating inpatient psychiatric units','Being the leading private funder of suicide and suicide prevention research globally','Providing primary care services with integrated mental health support','Administering federal grants for mental health parity legislation'], 'B'),
  q('How did the rate of suicide in the US change from 2000 to current times?', ['Decreased by approximately 10%','Increased by approximately 37%','Remained relatively constant','Increased significantly only in the population over age 65'], 'B'),
  q('What positive outcome has been observed in the first two years since the 988 Lifeline launch?', ['Decrease in total calls, indicating reduced need','Significant increase in utilization with good data on decreased wait times and increased effectiveness','Shift in primary users from individuals in crisis to helping persons','Complete elimination of need for local crisis centers'], 'B'),
  q('Which condition is used as an analogy for managing suicide risk?', ['COPD','Risk factors for dying of a heart attack','Early-stage cancer screening','Preventing Alzheimer\'s progression'], 'B'),
  q('What approach was recommended for holistic suicide risk assessment?', ['Relying solely on the SAD PERSONS assessment','Utilizing AI predictive analytics in isolation','Dr. Tony Pasani\'s safe side prevention training model','Focusing only on current suicidal ideation and intent'], 'C'),
  q('What was an unintended consequence of the FDA\'s 2004 black box warning on antidepressants?', ['Increased utilization of psychotherapy','Reduction in suicidal ideation across all age groups','Less frequent identification, diagnosis, and treatment of depression','Improved public understanding of antidepressant risks and benefits'], 'C'),
  q('Higher suicide rates in LGBTQ+ and Native American populations are best understood as resulting from:', ['Inherent biological or genetic vulnerabilities','The individual\'s identity in a vacuum','How their identity intersects with culture, discrimination, historical trauma, and systemic issues','Lack of awareness about available mental health resources'], 'C'),
  q('What practice was endorsed for standardized identification of suicide risk?', ['Intensive training on identifying non-verbal cues','Universal screening for suicide risk, recommended to begin at age 12','Limiting assessment only to patients who explicitly report suicidal thoughts','Focusing screening solely on populations with higher suicide rates'], 'B'),
  q('What does the latest data suggest about suicide rates among physicians and nurses?', ['Physicians overall have the highest rate among all occupations','Both male and female physicians have rates higher than non-physicians','Male physicians\' rates are similar to non-physician males while female physicians\' rates are higher; both male and female nurses have higher rates than non-nurses','Resident physicians have rates significantly higher than their age-matched cohort'], 'C'),
  q('Research on means restriction demonstrates what effect on population-level suicide rates?', ['Complete elimination of suicide events','Individuals simply substitute with another equally lethal means','Overall rates tend to decrease significantly (e.g., ~40%), indicating effectiveness even with some substitution','Means restriction primarily affects attempts but not completions'], 'C'),
]);

addQuiz('melatonin-ramelteon', 'Melatonin & Ramelteon', 'Sleep Medications', [
  q('What were the two primary motivations for developing Ramelteon (Rozerem)?', ['Shorter half-life than melatonin and target unique receptor subtypes','To develop a patentable version and a superior alternative to melatonin supplements with quality control issues','Exclusively metabolized by CYP3A4 and specifically indicated for sleep maintenance insomnia','An OTC option more affordable than prescription hypnotics and treatment for non-24-hour sleep-wake disorder'], 'B'),
  q('How much stronger does Ramelteon bind to MT1 and MT2 receptors compared to exogenous melatonin?', ['Approximately 1 to 2 times','Around 3 to 16 times','As much as 20 to 50 times','Similar binding affinity but longer half-life'], 'B'),
  q('Which statement reflects AASM recommendations regarding melatonin and Ramelteon?', ['Both recommended as first-line for sleep onset insomnia','AASM does not recommend melatonin for insomnia but does recommend Ramelteon, noting evidence is "very weak"','AASM recommends melatonin as first-line, Ramelteon only for sleep maintenance','AASM recommends neither for any form of insomnia'], 'B'),
  q('The Erland et al. (2017) study found what about OTC melatonin products?', ['About 20% contained active ingredients other than melatonin','Over 70% contained a different amount than advertised, sometimes by as much as 1/5 or 5 times the labeled dose','Over 80% were contaminated with heavy metals','All contained the advertised amount but varied in dissolution rates'], 'B'),
  q('Which medication is specifically contraindicated with Ramelteon due to potential 100-fold increase in serum concentrations?', ['Fluoxetine (Prozac)','Sertraline (Zoloft)','Fluvoxamine (Luvox)','Ciprofloxacin (Cipro)'], 'C'),
  q('The Crew et al. (2024) meta-analysis recommended what timing for melatonin administration?', ['Immediately before attempting to sleep','2 to 3 hours prior to bedtime','Upon waking in the morning','Timing does not significantly impact efficacy'], 'B'),
  q('What are the FDA-approved indications for Tasimelteon (Hetlioz)?', ['Primary insomnia and jet lag','Sleep onset and sleep maintenance insomnia','Non-24-hour sleep-wake rhythm disorder in blind patients and Smith-Magenis syndrome','MDD with insomnia and GAD'], 'C'),
  q('What is Agomelatine\'s unique pharmacological profile?', ['Selective serotonin and norepinephrine reuptake inhibitor','Antagonist at serotonin 2B and 2C receptors while also being an agonist at MT1 and MT2 receptors','Potent agonist at serotonin 1A receptors and weak D2 antagonist','Primarily a GABA-A receptor modulator'], 'B'),
  q('Which statement best summarizes the safety profile of melatonin and Ramelteon?', ['Commonly cause significant next-day sedation and high risk of falls','Frequently disrupt sleep architecture and lead to tolerance','They shine in safety, with main side effects like nausea and headaches at very low rates, and minimal tolerance or withdrawal','Comparable to benzodiazepine hypnotics in side effect burden'], 'C'),
  q('In which population was melatonin found to decrease delirium risk by 70-80% (Yang et al. 2020)?', ['Patients undergoing chemotherapy','Elderly patients or those with risk factors like infection or recent surgery, used prophylactically','Patients with COPD experiencing nocturnal desaturation','Pediatric patients with ADHD'], 'B'),
]);

addQuiz('z-drugs', 'Z-Drugs (Zolpidem, Eszopiclone, Zaleplon)', 'Sleep Medications', [
  q('Which statement reflects the US market status of Zopiclone and Zolpidem?', ['Zopiclone was first studied and first to receive US approval in 1992','Zolpidem was the first studied and brought to US market; Zopiclone approved in 2004','Zopiclone was first studied but never released in the US; Zolpidem was the first Z-drug brought to the US market in 1992','Both released simultaneously in the early 1990s'], 'C'),
  q('Which statement accurately describes Z-drug alpha subunit binding specificity?', ['Benzodiazepines are selective for alpha 1, while Z-drugs affect alpha 2, 3, and 5','Zolpidem and Zaleplon are more specific for alpha 1 compared to Eszopiclone and racemic Zopiclone, which hit all four alpha subunits','Z-drugs bind to alpha 2, 3, and 5 for anticonvulsant effects','Eszopiclone and Zopiclone are selective for alpha 1, while Zolpidem and Zaleplon are less selective'], 'B'),
  q('Which combination correctly pairs a Z-drug with its half-life and dosing nuance?', ['Zolpidem (IR): 6 hours; fixed dose regardless of gender','Zaleplon: 2-3 hours; started at 10 mg with max of 20 mg','Eszopiclone: 1 hour; maximum dose 1 mg in elderly','Zolpidem (IR): 2-3 hours; max should not exceed 5 mg in females due to slower metabolism'], 'D'),
  q('What percentage of total adult ED visits due to adverse psychiatric drug events were linked to Zolpidem?', ['21% of adult visits; comparable to SSRIs in geriatrics','12% of adult visits; significantly more than any other psychiatric medication in geriatrics','12% of adult visits; significantly less than benzodiazepines in geriatrics','3% to 15%; no specific geriatric data mentioned'], 'B'),
  q('When did FDA issue a black box warning for Z-drug parasomnias, and how many serious cases were reported 1992-2019?', ['2004; 20 serious cases','2011; 66 serious cases, 6 deaths','2019; 66 serious cases, 20 deaths','2019; data not available'], 'C'),
  q('What specific advantage of Z-drugs over benzodiazepines regarding sleep architecture is mentioned?', ['Significantly increase Stage 3 and 4 non-REM sleep','Increase total REM sleep time','Do not seem to disrupt sleep architecture as much as benzodiazepines','Eliminate REM sleep, which is beneficial'], 'C'),
  q('What did a 2022 Lancet systematic review conclude about Eszopiclone, and what benefit beyond sleep was mentioned?', ['Less effective but better tolerated than Zolpidem; may improve pain','Similar profiles; lower respiratory depression risk','Eszopiclone and Lemborexant had the best profile; may improve depression and anxiety','Inferior to benzodiazepines for long-term use; may improve appetite'], 'C'),
  q('All three Z-drugs are substrates of which primary CYP enzyme family?', ['CYP2D6; caution with inhibitors like bupropion','CYP2C19; caution with proton pump inhibitors','CYP3A4; caution with inducers and inhibitors','CYP1A2; smoking can reduce effectiveness'], 'C'),
  q('Where are Z-drugs generally recommended in the treatment hierarchy for insomnia?', ['First-line due to high efficacy','Long-term solution for chronic insomnia','As PRNs or in a short course after other medications have failed','Only in inpatient units for severe treatment-resistant insomnia'], 'C'),
  q('Which benzodiazepine is specifically mentioned as being seen commonly, having the longest half-life among the five listed, and why is caution advised in sleep apnea?', ['Triazolam; caution due to rebound insomnia','Temazepam; caution because benzodiazepines can cause respiratory depression in sleep apnea','Estazolam; higher potential for parasomnias','Flurazepam; significantly disrupts sleep architecture'], 'B'),
]);

addQuiz('h1-antagonists', 'H1 Antagonists for Insomnia', 'Sleep Medications', [
  q('What is the functional consequence of blocking histamine activity at the H1 receptor?', ['Increases histamine release from the hypothalamus, promoting wakefulness','Disrupts input to the suprachiasmatic nucleus','Reduces wakefulness and arousal by interfering with normal histamine activity','Increases metabolism of histamine, leading to reduced CNS histamine'], 'C'),
  q('What was the conclusion of the largest trazodone sleep trial and AASM\'s recommendation?', ['Strong efficacy for several months; recommended as first-line treatment','No efficacy beyond one week; recommended only in specific comorbid conditions','Only somewhat effective for one week and similar to placebo afterward; recommended against due to poor evidence','Effective for long-term maintenance; preferred alternative to benzodiazepines'], 'C'),
  q('What is the approximate rate of priapism for males on trazodone?', ['1 in 100 to 1 in 1,000; compared to aplastic anemia with Carbamazepine','1 in 1,000 to 1 in 10,000; compared to SJS with properly titrated Lamotrigine','1 in 10,000 to 1 in 100,000; compared to agranulocytosis with Clozapine','1 in 1,000; compared to NMS with antipsychotics'], 'B'),
  q('At what dose range is mirtazapine prescribed for sleep, and what happens at higher doses?', ['15-30 mg/night; blocks serotonin receptors which is activating','30-60 mg/night; increases histamine activity','7.5-15 mg/night; at higher doses (>15 mg), begins to modulate norepinephrine, which is activating','7.5-15 mg/night; loses affinity for the H1 receptor'], 'C'),
  q('Why is hydroxyzine generally preferred over diphenhydramine for insomnia?', ['Longer half-life providing more sustained sleep','FDA-approved for insomnia unlike diphenhydramine','Significantly less anticholinergic properties compared to diphenhydramine','Available in a more centrally acting formulation (Vistaril)'], 'C'),
  q('Which H1 antagonist is FDA-approved for insomnia and at what dose range?', ['Trazodone, 25-150 mg','Hydroxyzine, 25-100 mg','Doxepin, 3-6 mg','Mirtazapine, 7.5-15 mg'], 'C'),
  q('What is the primary CYP enzyme for doxepin metabolism and clinical consequence with strong inhibitors?', ['CYP2C19; risk of serotonin syndrome','CYP3A4; increased risk of cardiotoxicity','CYP2D6; increased plasma levels leading to anticholinergic side effects even at low doses','CYP1A2; reduced efficacy due to rapid metabolism'], 'C'),
  q('What was the key finding regarding sustained improvement of low-dose doxepin for insomnia vs placebo?', ['Short-term improvement up to 4 weeks only','Subjective improvement but no objective changes','Sustained improvement and noticeable separation from placebo even at 85 days','Improvement only when combined with behavioral therapy'], 'C'),
  q('Which issue was highlighted as less severe with H1 antagonists compared to benzodiazepines/Z-drugs?', ['QTC prolongation','Orthostatic hypotension','Rebound insomnia and tolerance upon discontinuation','Serotonin syndrome'], 'C'),
  q('What specific risk was associated with even very low doses (50 mg) of quetiapine per night for insomnia?', ['Neuroleptic induced movement disorders such as tardive dyskinesia','Significant cardiotoxicity and QTC prolongation','Significant weight gain and metabolic dysfunction','High risk of severe anticholinergic side effects'], 'C'),
]);

addQuiz('latuda', 'Lurasidone (Latuda)', 'Antipsychotics', [
  q('Which of the following was NOT listed as an off-label use for lurasidone?', ['Bipolar maintenance','Adjunctive treatment of MDD','MDD with psychotic features','Acute mania'], 'D'),
  q('Which pair of receptors has high affinity for lurasidone and is linked to cognition and memory?', ['D2 and 5HT2A','D4 and 5HT7','5HT1A and D4','5HT2A and 5HT1A'], 'C'),
  q('What is the primary metabolizing enzyme for lurasidone, and what strong inducer would reduce its levels?', ['CYP2D6; Ketoconazole','CYP3A4; Carbamazepine (Tegretol)','CYP3A4; Chlorimiasin','CYP1A2; Ketoconazole'], 'B'),
  q('What dose is required for schizophrenia vs mood disorders?', ['Schizophrenia: 20-40 mg; Mood: 80-160 mg','Schizophrenia: 80-160 mg; Mood: 20-80 mg','Schizophrenia: 40-80 mg; Mood: 20-40 mg','Schizophrenia: 80-160 mg; Mood: 20-40 mg'], 'B'),
  q('What are the other two medications in the "three L\'s" for bipolar depression?', ['Lamotrigine and Lithium','Latuda, Lamotrigine, and Lumateperone','Lithium and Lumateperone','Lamotrigine and Lexapro'], 'B'),
  q('What minimum calorie amount is recommended when taking lurasidone, and what percentage may not be absorbed without food?', ['250 calories; 50-60%','300 calories; 40-80%','350 calories; 30-70%','500 calories; 60-90%'], 'C'),
  q('Which was NOT listed as an advantage of lurasidone over ziprasidone?', ['Minimal to no QTC prolongation','Once-daily dosing','Decreased risk of metabolic side effects','Availability of a long-acting injectable formulation'], 'D'),
  q('What dosing strategy appeared to lower akathisia risk?', ['Dosed at a lower total daily dose','Dosed twice per day','Dosed once per day at nighttime with food','Dosed once per day in the morning'], 'C'),
  q('What are the "four A\'s" characterizing MDD with mixed features?', ['Affect, Appetite, Activity, Anhedonia','Agitation, Anger, Anxiety, Attention problems','Activation, Apathy, Akathisia, Anorexia','Aggression, Awareness, Agoraphobia, Ataxia'], 'B'),
  q('Which recently FDA-approved medication works on muscarinic receptors for schizophrenia?', ['Lumateperone (Caplyta)','Cariprazine (Vraylar)','Iloperidone (Fanapt)','Xanomeline-trospium (Cobenfy)'], 'D'),
]);

addQuiz('geodon', 'Ziprasidone (Geodon)', 'Antipsychotics', [
  q('What is one significant advantage of ziprasidone over many other antipsychotics?', ['Very long half-life allowing once-daily dosing','Typically does not cause much weight gain and may even lead to mild weight loss','FDA-approved for bipolar depression','Easily absorbed without regard to food intake'], 'B'),
  q('What rare clinical correlation has been observed due to ziprasidone\'s weak SRI properties?', ['Commonly causes severe hypertension','Frequently leads to profound sedation','Several rare case reports of inducing mania','Often necessitates high doses of MAO inhibitors'], 'C'),
  q('Ziprasidone is contraindicated with MAOIs primarily due to:', ['Increased risk of severe sedation','May cause serotonin syndrome due to weak serotonin and norepinephrine reuptake inhibition','High propensity to induce seizures','High effectiveness in treating MDD as monotherapy'], 'B'),
  q('What is crucial for proper absorption of oral ziprasidone?', ['Must be taken on an empty stomach','Requires simultaneous grapefruit juice','Must be taken with at least 500 calories','Can only be absorbed sublingually'], 'C'),
  q('What daily dose is often needed for optimal efficacy in schizophrenia and bipolar disorder?', ['40 mg/day','80 mg/day','120 mg/day','160 mg/day'], 'D'),
  q('Which significant side effect is ziprasidone notably associated with, restricting its max dose?', ['Severe hepatic dysfunction','Hypertensive emergency','QTC prolongation','Profound hyperglycemia'], 'C'),
  q('What specific EPS side effect has moderately high rates with ziprasidone?', ['Tardive dyskinesia','Oculogyric crisis','Akathisia','Bradykinesia'], 'C'),
  q('Patients switching from olanzapine to ziprasidone experienced average weight loss of approximately:', ['0.5 kg (1.1 lbs)','6.9 kg (15.2 lbs)','9.8 kg (21.6 lbs)','15 kg (33 lbs)'], 'C'),
  q('The short-acting IM formulation of ziprasidone fills a niche for treating what condition?', ['Severe depression in the elderly','Panic disorder in children','Insomnia associated with bipolar disorder','Delirium related agitation'], 'D'),
  q('What confounding factor may explain ziprasidone\'s less favorable CATIE trial results?', ['Unusually severe symptoms in state population','Average dosing appeared to be quite low','Patients were not monitored for QTC prolongation','Trial did not include a placebo group'], 'B'),
]);

// ─── Also import quizzes from content.js ───
const contentRaw = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
const contentMatch = contentRaw.match(/const CONTENT_DATA\s*=\s*(\{[\s\S]*\});?\s*$/m);
if (contentMatch) {
  const contentData = eval('(' + contentMatch[1] + ')');
  const lessonSlugMap = {
    'lesson-interview-intro':    { slug: 'psychiatric-interview',     cat: 'Interviewing & MSE' },
    'lesson-mse':                { slug: 'mental-status-exam',        cat: 'Interviewing & MSE' },
    'lesson-risk-assessment':    { slug: 'suicide-risk-assessment',   cat: 'Interviewing & MSE' },
    'lesson-diagnostic-formulation': { slug: 'diagnostic-formulation', cat: 'Interviewing & MSE' },
    'lesson-antipsych-overview': { slug: 'antipsychotics-overview',   cat: 'Antipsychotics' },
    'lesson-eps':                { slug: 'eps-content',               cat: 'Antipsychotics' },
    'lesson-metabolic-monitoring': { slug: 'metabolic-monitoring',    cat: 'Antipsychotics' },
    'lesson-lais':               { slug: 'lai-antipsychotics',       cat: 'Antipsychotics' },
    'lesson-clozapine-deep-dive': { slug: 'clozapine-deep-dive',     cat: 'Antipsychotics' },
    'lesson-quetiapine':         { slug: 'quetiapine-content',       cat: 'Antipsychotics' },
    'lesson-olanzapine':         { slug: 'olanzapine-content',       cat: 'Antipsychotics' },
    'lesson-fluphenazine':       { slug: 'fluphenazine',             cat: 'Antipsychotics' },
    'lesson-asenapine':          { slug: 'asenapine',                cat: 'Antipsychotics' },
    'lesson-antipsychotic-plasma': { slug: 'antipsychotic-tdm',      cat: 'Antipsychotics' },
    'lesson-antipsychotic-weight': { slug: 'antipsychotic-weight-content', cat: 'Antipsychotics' },
    'lesson-antidep-overview':   { slug: 'antidepressants-overview',  cat: 'Antidepressants' },
    'lesson-serotonin-syndrome': { slug: 'serotonin-syndrome',       cat: 'Antidepressants' },
    'lesson-discontinuation':    { slug: 'discontinuation-syndrome',  cat: 'Antidepressants' },
    'lesson-ssris':              { slug: 'ssris',                    cat: 'Antidepressants' },
    'lesson-snris':              { slug: 'snris',                    cat: 'Antidepressants' },
    'lesson-bupropion':          { slug: 'bupropion',                cat: 'Antidepressants' },
    'lesson-mirtazapine':        { slug: 'mirtazapine',              cat: 'Antidepressants' },
    'lesson-tcas':               { slug: 'tcas-content',             cat: 'Antidepressants' },
    'lesson-maois':              { slug: 'maois-content',            cat: 'Antidepressants' },
    'lesson-depression-inflammation': { slug: 'depression-inflammation', cat: 'Antidepressants' },
    'lesson-ketamine-trd':       { slug: 'ketamine-esketamine-content', cat: 'Antidepressants' },
    'lesson-novel-antidepressants': { slug: 'novel-antidepressants', cat: 'Antidepressants' },
    'lesson-nutritional-psychiatry': { slug: 'nutritional-psychiatry', cat: 'Antidepressants' },
    'lesson-lithium':            { slug: 'lithium',                  cat: 'Mood Stabilizers' },
    'lesson-valproate':          { slug: 'valproate',                cat: 'Mood Stabilizers' },
    'lesson-lamotrigine':        { slug: 'lamotrigine-carbamazepine', cat: 'Mood Stabilizers' },
    'lesson-benzos':             { slug: 'benzodiazepines',          cat: 'Anxiolytics & Sleep' },
    'lesson-sleep-meds':         { slug: 'sleep-pharmacology',       cat: 'Anxiolytics & Sleep' },
    'lesson-withdrawal-syndromes': { slug: 'withdrawal-syndromes',   cat: 'Substance Use' },
    'lesson-mat':                { slug: 'medication-assisted-treatment', cat: 'Substance Use' },
    'lesson-stimulants-cannabis': { slug: 'stimulants-cannabis',     cat: 'Substance Use' },
    'lesson-nms-catatonia':      { slug: 'nms-catatonia',            cat: 'Emergencies' },
    'lesson-agitation-holds':    { slug: 'agitation-lithium-toxicity', cat: 'Emergencies' },
    'lesson-pregnancy-psychiatry': { slug: 'pregnancy-psychiatry',   cat: 'Special Populations' },
    'lesson-geriatric-psychiatry': { slug: 'geriatric-delirium',     cat: 'Special Populations' },
    'lesson-child-adolescent':   { slug: 'child-adolescent',         cat: 'Special Populations' },
  };

  const existingSlugs = new Set(quizzes.map(q => q.slug));

  for (const mod of contentData.modules) {
    for (const lesson of mod.lessons) {
      if (!lesson.quizQuestions || lesson.quizQuestions.length === 0) continue;
      const mapping = lessonSlugMap[lesson.id];
      if (!mapping) continue;
      if (existingSlugs.has(mapping.slug)) continue;

      addQuiz(mapping.slug, lesson.title, mapping.cat, lesson.quizQuestions.map(qu => {
        const correct = qu.correct[0].toUpperCase();
        return q(qu.stem, qu.options.map(o => o.text), correct, qu.explanation || '');
      }));
    }
  }
}

console.log(`Generating ${quizzes.length} quiz pages...`);

const outDir = path.join(__dirname, 'quizzes');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

quizzes.forEach(quiz => {
  const html = generateQuizHTML(quiz.title, quiz.category, quiz.questions);
  const filePath = path.join(outDir, `${quiz.slug}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  ✓ ${quiz.slug}.html (${quiz.questions.length} questions)`);
});

console.log(`\nDone! Generated ${quizzes.length} quiz pages in /quizzes/`);
