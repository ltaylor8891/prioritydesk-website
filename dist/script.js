'use strict';
const initialTasks = [
  {id:1,title:'Bring the new workspace to life',note:'A little planning now, a calmer desk later. Gather ideas and decide what belongs in the new space.',project:'Studio refresh',priority:'High',due:'Today',status:'In progress',done:false},
  {id:2,title:'Collect a few good ideas',note:'Save references, colour palettes, and useful inspiration for the studio.',project:'Studio refresh',priority:'Medium',due:'This week',status:'Open',done:false},
  {id:3,title:'Order the desk essentials',note:'Check the list before ordering. A notebook, a good lamp, and somewhere for the little things.',project:'Studio refresh',priority:'Low',due:'This week',status:'Open',done:false},
  {id:4,title:'Book that appointment',note:'Check the calendar and find a time that leaves a little breathing room.',project:'Everyday things',priority:'High',due:'Today',status:'Open',done:false},
  {id:5,title:'Clear a little space',note:'One small thing done. That’s a good place to start.',project:'Everyday things',priority:'Low',due:'No date',status:'Completed',done:true}
];
let tasks = initialTasks.map(task => ({...task}));
let activeFilter = 'all';
let selectedId = 1;
const list = document.querySelector('#task-list');
const feedback = document.querySelector('#demo-feedback');
const filters = {all:'All tasks',today:'Due today',high:'High priority',completed:'Completed'};
function matches(task) {return activeFilter === 'all' || (activeFilter === 'today' && task.due === 'Today' && !task.done) || (activeFilter === 'high' && task.priority === 'High' && !task.done) || (activeFilter === 'completed' && task.done);}
function makeElement(tag, className, text) {const node = document.createElement(tag); if(className) node.className = className; if(text !== undefined) node.textContent = text; return node;}
function renderDetail() {
  const task = tasks.find(item => item.id === selectedId);
  if (!task) return;
  document.querySelector('#detail-title').textContent = task.title;
  document.querySelector('#detail-project').textContent = task.project.toUpperCase();
  document.querySelector('#detail-note').textContent = task.note;
  const priority = document.querySelector('#detail-priority');
  priority.textContent = task.priority; priority.className = `priority ${task.priority.toLowerCase()}`;
  document.querySelector('#detail-due').textContent = task.due;
  document.querySelector('#detail-status').textContent = task.done ? 'Completed' : task.status;
}
function render() {
  list.replaceChildren();
  const visible = tasks.filter(matches);
  if (visible.length && !visible.some(task => task.id === selectedId)) selectedId = visible[0].id;
  for (const project of [...new Set(visible.map(task => task.project))]) {
    const group = makeElement('div','task-group',project);
    group.prepend(makeElement('i',`project-square ${project === 'Everyday things' ? 'sage' : ''}`));
    list.append(group);
    for (const task of visible.filter(item => item.project === project)) {
      const row = makeElement('div',`task-row${task.done ? ' done' : ''}${task.id === selectedId ? ' selected' : ''}`);
      const check = makeElement('input','task-check'); check.type = 'checkbox'; check.checked = task.done;
      check.setAttribute('aria-label',`Mark ${task.title} ${task.done ? 'incomplete' : 'complete'}`);
      check.addEventListener('change',() => {task.done = check.checked; selectedId = task.id; render(); feedback.textContent = task.done ? 'One less thing on your mind. Nicely done.' : 'Back on the list. Take it at your own pace.';});
      const select = makeElement('button','select-task'); select.type = 'button'; select.setAttribute('aria-pressed',String(selectedId === task.id));
      select.append(makeElement('span','task-title',task.title),makeElement('span','task-subtitle',task.note));
      select.addEventListener('click',() => {selectedId = task.id; render(); feedback.textContent = `${task.title} — ${task.done ? 'Completed' : task.status}. ${task.note}`;});
      row.append(check,select);
      if(task.due === 'Today') row.append(makeElement('span','row-due','Today'));
      row.append(makeElement('span',`priority ${task.priority.toLowerCase()}`,task.priority));
      list.append(row);
    }
  }
  if(!visible.length) list.append(makeElement('p','empty-state','Nothing here for now. A little breathing room.'));
  for(const button of document.querySelectorAll('[data-filter]')) {
    button.classList.toggle('active',button.dataset.filter === activeFilter);
    button.setAttribute('aria-pressed',String(button.dataset.filter === activeFilter));
    const count = button.querySelector('.count');
    const filter = button.dataset.filter;
    count.textContent = tasks.filter(task => filter === 'all' || (filter === 'today' && task.due === 'Today' && !task.done) || (filter === 'high' && task.priority === 'High' && !task.done) || (filter === 'completed' && task.done)).length;
  }
  const title = document.querySelector('#view-title'); title.textContent = filters[activeFilter]; title.append(makeElement('span','red-dot','.'));
  renderDetail();
}
for(const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click',() => {activeFilter = button.dataset.filter; render(); feedback.textContent = `Showing ${filters[activeFilter].toLowerCase()}.`;});
document.querySelector('#add-task-form').addEventListener('submit',event => {
  event.preventDefault();
  const input = document.querySelector('#new-task'); const title = input.value.trim();
  if(!title) {input.value = ''; input.focus(); return;}
  const id = Math.max(...tasks.map(task => task.id)) + 1;
  tasks.push({id,title,note:'Your example task. This preview resets when you reload the page.',project:'Everyday things',priority:'Medium',due:'No date',status:'Open',done:false});
  selectedId = id; activeFilter = 'all'; input.value = ''; render(); feedback.textContent = 'A little more headspace. Your example task is on the list.';
});
document.querySelector('#reset-demo').addEventListener('click',() => {tasks = initialTasks.map(task => ({...task})); activeFilter = 'all'; selectedId = 1; document.querySelector('#new-task').value = ''; render(); feedback.textContent = 'Preview reset. A fresh start.';});
render();

const screenshots = {
  tasks: {src:'images/windows-tasks.png',alt:'Priority Desk on Windows showing tasks grouped by project, coloured priorities, and a detail pane with child tasks.',caption:'Projects, priorities and the details of your next step, all in one view.'},
  summary: {src:'images/windows-summary.png',alt:'Priority Desk on Windows with a task summary tooltip showing notes, project, priority, status and due date.',caption:'Hover over a task for its notes, priority, due date and progress at a glance.'},
  editor: {src:'images/windows-editor.png',alt:'Priority Desk Windows task editor with notes, attachments, project and priority settings.',caption:'Keep notes and files with the task they belong to. Edit the details in one place.'}
};
for (const button of document.querySelectorAll('[data-screenshot]')) {
  button.addEventListener('click', () => {
    const shot = screenshots[button.dataset.screenshot];
    const image = document.querySelector('#windows-image');
    image.src = shot.src;
    image.alt = shot.alt;
    document.querySelector('#windows-image-link').href = shot.src;
    document.querySelector('#windows-caption').textContent = shot.caption;
    for (const choice of document.querySelectorAll('[data-screenshot]')) choice.setAttribute('aria-pressed', String(choice === button));
  });
}
