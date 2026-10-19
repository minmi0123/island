// 기록: 지금까지 한 일을 센다. 칭호 · 엔딩 카드 · 안내에 쓴다 (예전 섬 일기에서 세는 것만 남겼다)
'use strict';

const stats = {
  chop: 0, log: 0, egg: 0, fish: 0, miss: 0, early: 0, scared: 0, ateEgg: 0, ateFish: 0, ateMeat: 0, cooked: 0, hunt: 0,
  hungry: 0, starve: 0, walk: 0, fire: 0, coop: 0, house: 0, chick: 0, grown: 0, raft: 0, faint: 0,
  play: 0,   // hungry · starve · play 는 프레임, walk 는 px
};

function note(key, n = 1) { stats[key] += n; }

// 섬에서 보낸 시간 (프레임 → "1시간 5분" · "12분")
function playTime(frames = stats.play) {
  const min = Math.floor(frames / 3600);
  if (min < 1) return '1분도 안 돼서';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}시간${m ? ' ' + m + '분' : ''}` : `${m}분`;
}
