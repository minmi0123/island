// 숫자: 속도 · 시간 · 비용. 밸런스는 여기만 고친다 (시간은 프레임, 60 = 1초)
'use strict';

// 주인공 · 도끼질
const SPEED = 0.9;
const REACH_X = 15, REACH_Y = 9;
const SWING_LEN = 24, HIT_AT = 10;
const REGROW = 60 * 40;

// 체력: 일(도끼질 · 낚시)을 하면 준다. 0 이면 기절
const HP_MAX = 100;
const HP_PER_HIT = 3;                          // 도끼질 한 번 (나무 한 그루 = 3번)
const HP_PER_CAST = 2;                         // 낚싯대 한 번 던지기
const HP_REST = HP_MAX / (60 * 90);            // 일을 안 하면 90초면 다 찬다 (배가 비어 있으면 안 찬다)
const HP_STARVE = HP_MAX / (60 * 90);          // 배가 비면 90초면 바닥

// 배부름
const FULL_MAX = 100, FULL_START = 80;
const FULL_DRAIN = FULL_MAX / (60 * 150);      // 가만히 있어도 2분 30초면 바닥
const FULL_PER_HIT = 1.5;                      // 도끼질 한 번
const FULL_PER_EGG = 35;
const FULL_PER_FISH = 50;
const FULL_PER_MEAT = 60;

// 짓기 (통나무)
const FIRE_COST = 3;
const COOP_COST = 5;
const HOUSE_COST = 8;

// 닭 · 닭장
const CHICKEN_COUNT = 5;
const CHICKEN_SPEED = 0.35, CHICKEN_FLEE = 1.3;   // 도망은 주인공(SPEED)보다 빠르다. 넓은 데선 못 잡는다
const CHICKEN_NOTICE = 14;                     // 걷는 주인공이 이만큼 가까우면 닭이 달아난다
const EGG_MIN = 60 * 20, EGG_MAX = 60 * 40;   // 알 낳는 간격
const EGG_LIMIT = 6;                           // 땅에 깔린 알이 이만큼이면 더 안 낳는다
const COOP_SPAWN = 60 * 30;                    // 닭장 하나가 병아리를 내보내는 간격
const COOP_ROOM = 4;                           // 닭장 하나당 늘어나는 닭 수
const GROW_TIME = 60 * 40;                     // 병아리가 닭이 되는 시간
const CATCH_R = 6;                             // 걷다가 다 큰 닭이 이만큼 가까우면 잡는다. 닭이 더 빨라서 구석으로 몰아야 닿는다
const HUNT_HINT = 8;                           // 닭을 이만큼 놀래면 사냥 안내

// 굽기
const COOK_TIME = 120;                         // 달걀 하나 굽는 시간
const COOK_REACH = 18;
const COOK = {   // 날것 → 구운 것
  egg: { out: 'fried', time: COOK_TIME },
  fish: { out: 'grilled', time: 180 },
  meat: { out: 'roast', time: 240 },
};

// 낚시
const FISH_STILL = 30;                         // 이만큼 가만히 서 있으면 낚싯대를 던진다
const FISH_WAIT_MIN = 60 * 2, FISH_WAIT_MAX = 60 * 5;
const FISH_BITE = 50;                          // 찌가 들어가 있는 시간. 이 안에 눌러야 잡힌다

// 가방
const BAG_SLOTS = 50;                          // 칸 수
const BAG_STACK = 99;                          // 한 칸에 같은 것 이만큼까지

// 뗏목 · 엔딩 (집을 지으면 뗏목도 엮을 수 있다. 탈출 테크는 7단계에서 다시 짠다)
const RAFT_LOGS = 30;                          // 뗏목 하나에 드는 통나무
const RAFT_FEED = 15;                          // 뗏목 옆에 서 있으면 이 간격으로 통나무를 하나씩 엮는다
const RAFT_FISH = 2;                           // 떠날 때 챙겨야 하는 구운 생선 (뗏목 터를 잡으면 먹기는 달걀부터)
const SAIL_TIME = 60 * 4;                      // 떠나는 장면 길이

const fishWait = () => FISH_WAIT_MIN + Math.floor(rand() * (FISH_WAIT_MAX - FISH_WAIT_MIN));
const nextEgg = () => EGG_MIN + Math.floor(rand() * (EGG_MAX - EGG_MIN));
