import AstalCava from 'gi://AstalCava';

let cavaInstance: AstalCava.Cava | null = null;
let activeConsumers = 0;

function getCava() {
  cavaInstance ??= AstalCava.get_default();
  return cavaInstance;
}

export function isCavaAvailable() {
  return Boolean(getCava());
}

export function acquireCava(onValuesChanged: () => void) {
  const cava = getCava();
  if (!cava) return null;

  activeConsumers++;
  if (activeConsumers === 1) cava.active = true;
  const valuesHook = cava.connect('notify::values', onValuesChanged);
  let released = false;

  return {
    cava,
    release: () => {
      if (released) return;
      released = true;
      cava.disconnect(valuesHook);
      activeConsumers = Math.max(0, activeConsumers - 1);
      if (activeConsumers === 0) cava.active = false;
    },
  };
}
