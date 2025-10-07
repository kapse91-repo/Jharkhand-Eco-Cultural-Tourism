// Simple client-side prototype for itinerary generation and multilingual voice assistant

// Sample attractions for Jharkhand (minimal dataset)
const ATTRACTIONS = [
  { id:1, name:"Betla National Park", tags:["nature","wildlife","adventure"], region:"Palamu", duration:1, description:"Tigers, forests, safari." },
  { id:2, name:"Ranchi - Hundru Falls", tags:["nature","adventure"], region:"Ranchi", duration:0.5, description:"Scenic waterfall and picnic area." },
  { id:3, name:"Deo Surya Mandir (Deoghar)", tags:["culture","history"], region:"Deoghar", duration:1, description:"Famous Sun temple and pilgrimage site." },
  { id:4, name:"Hill Top (Netarhat)", tags:["nature","relaxation"], region:"Latehar", duration:1, description:"Sunrise viewpoint and quiet hills." },
  { id:5, name:"Jonha Falls", tags:["nature","adventure"], region:"Ranchi", duration:0.75, description:"Waterfall with scenic steps." },
  { id:6, name:"Hazaribagh Wildlife Sanctuary", tags:["wildlife","nature"], region:"Hazaribagh", duration:1.5, description:"Wildlife, birds, forests." },
  { id:7, name:"Stone Age Cave Sites (Isko/Peer)", tags:["history","culture"], region:"Palamu", duration:1, description:"Prehistoric rock art & archaeology." },
];

// UI wiring
const chips = document.querySelectorAll('.chip');
const generateBtn = document.getElementById('generate');
const itineraryDiv = document.getElementById('itinerary');
const daysInput = document.getElementById('days');
const paceSelect = document.getElementById('pace');
const attractionList = document.getElementById('attraction-list');

let selectedTags = new Set();
chips.forEach(chip=>{
  chip.addEventListener('click', ()=>{
    const tag = chip.dataset.tag;
    if(selectedTags.has(tag)){ selectedTags.delete(tag); chip.classList.remove('active'); }
    else { selectedTags.add(tag); chip.classList.add('active'); }
  });
});

// Render sample attractions
function renderAttractions(){
  attractionList.innerHTML = '';
  ATTRACTIONS.forEach(a=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>${a.name}</strong> — <em>${a.region}</em><br/><small>${a.description}</small>`;
    attractionList.appendChild(li);
  });
}
renderAttractions();

// Simulated AI itinerary generator
function simulateItinerary({days, tags, pace}){
  // Simple scoring: match tags + prefer variety + respect pace/days
  let pool = ATTRACTIONS.map(a=>{
    let score = 0;
    if(tags.size === 0) score = 1; // no preference -> neutral
    for(const t of tags){
      if(a.tags.includes(t)) score += 2;
    }
    // slight boost for shorter duration when pace is busy
    if(pace === 'busy') score += (1 / (a.duration + 0.1));
    // variety penalty if same region duplicated (handled later)
    return {...a, score};
  });

  // Sort by score descending
  pool.sort((p,q)=>q.score - p.score);

  // Select ~ 2 attractions per day for moderate, 1.2 for relaxed, 3 for busy
  let perDay = pace === 'relaxed' ? 1.2 : pace === 'busy' ? 3 : 2;
  let targetCount = Math.max(1, Math.round(perDay * days));

  // pick with region diversity
  const chosen = [];
  const regions = new Set();
  for(const item of pool){
    if(chosen.length >= targetCount) break;
    // prefer new region
    if(!regions.has(item.region) || Math.random() > 0.6){
      chosen.push(item);
      regions.add(item.region);
    }
  }
  // fallback fill
  for(const item of pool){
    if(chosen.length >= targetCount) break;
    if(!chosen.includes(item)) chosen.push(item);
  }

  // Build day-wise plan
  const plan = [];
  let idx = 0;
  for(let d=1; d<=days; d++){
    const daySlots = Math.max(1, Math.round(targetCount / days));
    const dayItems = chosen.slice(idx, idx + daySlots);
    plan.push({day:d, items:dayItems});
    idx += daySlots;
  }
  return plan;
}

// UI event for generate
generateBtn.addEventListener('click', ()=>{
  const days = parseInt(daysInput.value) || 1;
  const pace = paceSelect.value;
  const plan = simulateItinerary({days, tags:selectedTags, pace});
  displayItinerary(plan);
});

function displayItinerary(plan){
  itineraryDiv.innerHTML = '';
  plan.forEach(day=>{
    const dayDiv = document.createElement('div');
    dayDiv.style.marginBottom = '10px';
    const title = document.createElement('strong');
    title.textContent = `Day ${day.day}`;
    dayDiv.appendChild(title);
    const ul = document.createElement('ul');
    day.items.forEach(i=>{
      const li = document.createElement('li');
      li.innerHTML = `<strong>${i.name}</strong> — <em>${i.region}</em> (${i.duration} day) <br/><small>${i.description}</small>`;
      ul.appendChild(li);
    });
    dayDiv.appendChild(ul);
    itineraryDiv.appendChild(dayDiv);
  });
}

/* ---------------------------
  Multilingual voice assistant
   - Uses Web Speech API for recognition & synthesis (browser support required)
   - This is local; for robust NLP replace with server/AIs
------------------------------*/
const startBtn = document.getElementById('start-rec');
const stopBtn = document.getElementById('stop-rec');
const langSelect = document.getElementById('language');
const transcriptDiv = document.getElementById('transcript');
const assistantRespDiv = document.getElementById('assistant-response');
const speakSampleBtn = document.getElementById('speak-sample');

let recognizer = null;
let recognizing = false;

// Basic local "assistant" responses (simulate AI)
function assistantRespond(text, locale){
  // Very simple rule-based processing
  const normalized = text.toLowerCase();
  let reply = "I'm sorry, I didn't get that. You can ask for 'itinerary', 'attractions', or 'help'.";
  if(normalized.includes('itinerary')){
    reply = "To generate an itinerary, choose days, interests and click 'Generate itinerary'. I can also suggest a 3-day nature-focused plan.";
  } else if(normalized.includes('attraction') || normalized.includes('attractions')){
    reply = "I can show popular attractions like Betla National Park, Hundru Falls, Deoghar Sun Temple. Tell me your interest to refine.";
  } else if(normalized.includes('hello') || normalized.includes('hi')){
    reply = "Hello! How can I help you plan your trip to Jharkhand?";
  } else if(normalized.includes('bye') || normalized.includes('thanks')){
    reply = "You're welcome! Have a great trip.";
  } else if(normalized.includes('suggest')){
    reply = "Suggesting a nature-focused 2-day plan: Day 1 - Betla National Park; Day 2 - Hundru Falls & Netarhat sunrise spot.";
  }

  assistantRespDiv.innerHTML = `<strong>Assistant (${locale}):</strong> ${reply}`;
  speakText(reply, locale);
}

// Speech synthesis
function speakText(text, locale){
  if(!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = locale || 'en-US';
  // pick a voice that matches locale if available
  const voices = speechSynthesis.getVoices();
  let voice = voices.find(v => v.lang && v.lang.startsWith(locale.split('-')[0]));
  if(voice) utter.voice = voice;
  utter.rate = 1;
  speechSynthesis.speak(utter);
}

// Speech recognition start
startBtn.addEventListener('click', async ()=>{
  if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){
    alert('Speech Recognition not supported in this browser. Use Chrome or Edge.');
    return;
  }
  const Locale = langSelect.value;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognizer = new SpeechRecognition();
  recognizer.lang = Locale;
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  recognizer.onstart = ()=>{recognizing = true; startBtn.disabled = true; stopBtn.disabled = false; transcriptDiv.innerHTML = "Listening...";};
  recognizer.onresult = (ev)=>{
    const text = ev.results[0][0].transcript;
    transcriptDiv.innerHTML = `<strong>You:</strong> ${text}`;
    // Pass to assistant (simulate AI)
    assistantRespond(text, Locale);
  };
  recognizer.onerror = (e)=>{ transcriptDiv.innerHTML = `<strong>Error:</strong> ${e.error}`; stopRecognition(); };
  recognizer.onend = ()=>{ recognizing = false; startBtn.disabled = false; stopBtn.disabled = true; };
  recognizer.start();
});

// stop recognition
function stopRecognition(){
  if(recognizer && recognizing){
    recognizer.stop();
  }
  recognizing = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}
stopBtn.addEventListener('click', stopRecognition);

// Speak sample prompt
speakSampleBtn.addEventListener('click', ()=>{
  const locale = langSelect.value;
  const prompt = locale.startsWith('hi') ? 'नमस्ते, आप मेरी कैसे मदद कर सकते हैं?' : 'Hello, can you suggest a 3-day itinerary focusing on nature?';
  transcriptDiv.innerHTML = `<strong>Sample:</strong> ${prompt}`;
  assistantRespond(prompt, locale);
});

// On page load, warm up voices
window.speechSynthesis.onvoiceschanged = () => {
  // no-op; ensures voices are loaded
};

// End of script