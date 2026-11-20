// One clock per drive. A real drive runs on the wall clock. A simulated drive runs `speed` times
// faster, so every timestamp it records (arrivals, the cold timer, ETAs, the report) is in drive
// time and reads like a real drive: a 40-minute route takes 40 drive-minutes at any speed.
// clock: {real0, sim0, speed}: drive time = sim0 + (wall time - real0) × speed.
export const simNow = (d, real = Date.now()) => (d?.clock ? d.clock.sim0 + (real - d.clock.real0) * d.clock.speed : real);
export const newClock = (speed = 1, now = Date.now()) => ({real0: now, sim0: now, speed: speed || 1});
// Change speed mid-drive without a jump: the new segment starts where drive time is now.
export const rebase = (d, speed, real = Date.now()) => ({real0: real, sim0: simNow(d, real), speed: speed || 1});
export const isSimulated = (d) => (d?.clock?.speed || 1) !== 1 || !!d?.sim;
