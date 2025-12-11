Acceptance tests (manual)

1. Open `index.html` — KaTeX renders without errors.
2. Forward Pass: set x1=92, x2=25 and weights w0=0.5,w1=0.02,w2=0.03. Click Run Forward Pass — observe animation and LaTeX showing z and a.
3. Compute Grad: set y target and click Compute Grad — confirm numeric substitution shown and grads displayed.
4. Update Weights: click Update Weights — verify inputs for w0/w1/w2 changed accordingly.
5. CSV upload: choose a CSV with numeric columns — app logs upload (parsing errors reported).
6. Keyboard: press Space to run forward, R to randomize weights, ArrowRight to step.
