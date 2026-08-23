import { parentPort } from 'worker_threads';
import { BotInstance } from '../bot/BotInstance';
import { SurvivalMission } from './SurvivalMission';

let mission: SurvivalMission | null = null;
let missionBot: BotInstance | null = null;

const proto = BotInstance.prototype as any;
const originalStart = proto.startSurvivalLoop;
const originalStopAmbient = proto.stopAmbientBehaviors;

// Replace the old generic hunger/torch survival loop with the deterministic
// survival mission. The rest of BotInstance/Voyager remains untouched.
proto.startSurvivalLoop = function (): void {
  missionBot = this as BotInstance;
  if (!mission) {
    mission = new SurvivalMission(
      () => (this as any).bot,
      (this as any).name,
      () => { try { (this as any).voyagerLoop?.pause('survival-mission'); } catch {} },
    );
  }
  mission.resume();
};

// Stop our independent timer when the normal worker lifecycle stops ambient
// behaviors. This prevents a disconnected worker from keeping a mission alive.
proto.stopAmbientBehaviors = function (): void {
  try { mission?.stop(); } catch {}
  return originalStopAmbient?.call(this);
};

// Death recovery is handled by the mission's persisted state: the mission keeps
// its stage and resumes after Mineflayer emits spawn again.
if (parentPort) {
  parentPort.on('message', (msg: any) => {
    if (msg?.kind !== 'command' || typeof msg.type !== 'string') return;
    if (!msg.type.startsWith('survival:')) return;

    const command = msg.type.slice('survival:'.length);
    try {
      if (!mission) {
        console.log('[survival] Mission is not initialized yet. Wait for FayaazMJacc to spawn.');
        return;
      }
      switch (command) {
        case 'task':
        case 'status':
          console.log('[survival]', JSON.stringify(mission.status(), null, 2));
          break;
        case 'coords': {
          const s: any = mission.status();
          console.log('[survival] coords:', s.position ? `${s.position.x} ${s.position.y} ${s.position.z}` : 'not spawned');
          break;
        }
        case 'inv': {
          const bot: any = (missionBot as any)?.bot;
          const items = bot?.inventory?.items?.().map((i: any) => `${i.name} x${i.count}`) ?? [];
          console.log('[survival] inventory:', items.length ? items.join(', ') : '(empty)');
          break;
        }
        case 'stop':
          mission.stop();
          console.log('[survival] stopped and progress saved');
          break;
        case 'resume':
          mission.resume();
          console.log('[survival] resumed');
          break;
        case 'help':
          console.log('[survival] commands: task, coords, inv, status, stop, resume, help');
          break;
        default:
          console.log(`[survival] unknown command '${command}'. Use: task, coords, inv, status, stop, resume, help`);
      }
    } catch (err: any) {
      console.log('[survival] command failed:', err?.message || String(err));
    }
  });
}

void originalStart; // retained for documentation/backward compatibility; not invoked.
