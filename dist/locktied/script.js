'use strict';
const previews = {
  note: { kicker: 'A FEW WORDS GO A LONG WAY', title: 'Your words.\nTheir next smile.', description: "A good morning. A good luck. A reminder that they're on your mind. Write a little note and turn it into something they'll see when they reach for their phone.", alt: 'LockTied note editor with a Thinking of you message on a lavender canvas.' },
  photo: { kicker: 'THE MOMENTS WORTH SHARING', title: 'Your favourite view.\nSent with love.', description: 'A little moment from your day, or a memory you both love. Choose a photo from your gallery or take a new one, then add a note or a doodle to make it yours.', alt: 'LockTied photo editor with a sunset image on the shared wallpaper canvas.' },
  doodle: { kicker: 'PERFECTLY IMPERFECT', title: 'A little scribble.\nA lot of you.', description: "You don't have to be an artist. Draw a heart, leave a little sketch or add your own touch to a photo. Preview your creation, then send it to your person's lock screen.", alt: 'LockTied doodle editor with a hand-drawn heart on the wallpaper canvas.' }
};
const buttons = document.querySelectorAll('[data-view]');
buttons.forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.view;
  const view = previews[key];
  if (!view) return;
  buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.getElementById('view-kicker').textContent = view.kicker;
  const title = document.getElementById('view-title');
  title.replaceChildren();
  view.title.split('\n').forEach((line, index) => {
    if (index) title.append(document.createElement('br'));
    title.append(document.createTextNode(line));
  });
  document.getElementById('view-description').textContent = view.description;
  const image = document.getElementById('preview-image');
  image.src = 'images/' + key + '.png';
  image.alt = view.alt;
  document.getElementById('preview-link').href = image.getAttribute('src');
}));
