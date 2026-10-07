const addr = document.getElementById('addr');

for (const command of ['back', 'forward', 'reload', 'home', 'close']) {
  document.getElementById(command).addEventListener('click', () => browser[command]());
}

addr.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    addr.blur();
    browser.go(addr.value);
  }
});

browser.onUrl((url) => {
  if (document.activeElement !== addr) addr.value = url;
});
