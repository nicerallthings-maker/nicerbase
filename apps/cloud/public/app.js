document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-copy]')
  if (btn) {
    navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () {
      var label = btn.textContent
      btn.textContent = 'Copied'
      setTimeout(function () {
        btn.textContent = label
      }, 1500)
    })
  }
  var reveal = e.target.closest('[data-reveal]')
  if (reveal) {
    var el = document.getElementById(reveal.getAttribute('data-reveal'))
    var hidden = el.getAttribute('data-hidden') === 'true'
    el.textContent = hidden ? el.getAttribute('data-value') : el.getAttribute('data-masked')
    el.setAttribute('data-hidden', hidden ? 'false' : 'true')
    reveal.textContent = hidden ? 'Hide' : 'Reveal'
  }
})
document.addEventListener('submit', function (e) {
  var msg = e.target.getAttribute('data-confirm')
  if (msg && !window.confirm(msg)) e.preventDefault()
})
