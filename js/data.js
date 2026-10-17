// 숫자: 속도 · 시간 · 비용. 밸런스는 여기만 고친다 (시간은 프레임, 60 = 1초)
'use strict';

// 주인공 · 도끼질
const SPEED = 0.9;
const REACH_X = 15, REACH_Y = 9;
const SWING_LEN = 24, HIT_AT = 10;
const REGROW = 60 * 40;

// 배부름
const FULL_MAX = 100, FULL_START = 80;
const FULL_DRAIN = FULL_MAX / (60 * 150);      // 가만히 있어도 2분 30초면 바닥
const FULL_PER_HIT = 1.5;                      // 도끼질 한 번
const FULL_PER_EGG = 35;
const FULL_PER_FISH = 50;

// 짓기 (통나무)
const FIRE_COST = 3;
const COOP_COST = 5;
const HOUSE_COST = 8;

// 닭 · 닭장
const CHICKEN_COUNT = 5;
const CHICKEN_SPEED = 0.35, CHICKEN_FLEE = 1.0;
const EGG_MIN = 60 * 12, EGG_MAX = 60 * 25;   // 알 낳는 간격
const EGG_LIMIT = 6;                           // 땅에 깔린 알이 이만큼이면 더 안 낳는다
const COOP_SPAWN = 60 * 30;                    // 닭장 하나가 병아리를 내보내는 간격
const COOP_ROOM = 4;                           // 닭장 하나당 늘어나는 닭 수
const GROW_TIME = 60 * 40;                     // 병아리가 닭이 되는 시간

// 굽기
const COOK_TIME = 120;                         // 달걀 하나 굽는 시간
const COOK_REACH = 18;
const COOK = {   // 날것 → 구운 것
  egg: { out: 'fried', time: COOK_TIME },
  fish: { out: 'grilled', time: 180 },
};

// 낚시
const FISH_STILL = 30;                         // 이만큼 가만히 서 있으면 낚싯대를 던진다
const FISH_WAIT_MIN = 60 * 2, FISH_WAIT_MAX = 60 * 5;
const FISH_BITE = 50;                          // 찌가 들어가 있는 시간. 이 안에 눌러야 잡힌다

// 잠
const SLEEP_COOL = 60 * 90;                    // 한 번 자고 나면 이만큼은 다시 못 잔다
const SLEEP_HUNGER = 15;                       // 집에서 자고 일어나면 배가 이만큼 꺼져 있다
const SLEEP_HUNGER_OUT = 25;                   // 모닥불 옆(바깥)에서 자면
const NIGHT_EGG_LIMIT = 12;                    // 밤사이 낳는 알은 땅에 이만큼까지

// 뗏목 · 엔딩
const RAFT_DAY = 3;                            // 이 날부터 뗏목을 만들 수 있다
const RAFT_LOGS = 20;                          // 뗏목 하나에 드는 통나무
const RAFT_FEED = 15;                          // 뗏목 옆에 서 있으면 이 간격으로 통나무를 하나씩 엮는다
const RAFT_FOOD = 3;                           // 떠날 때 챙겨야 하는 구운 음식
const SAIL_TIME = 60 * 4;                      // 떠나는 장면 길이

// 일기
const DIARY_LINES = 3;                         // 하루 일기 본문 줄 수 (맺음말 빼고)

const fishWait = () => FISH_WAIT_MIN + Math.floor(rand() * (FISH_WAIT_MAX - FISH_WAIT_MIN));
const nextEgg = () => EGG_MIN + Math.floor(rand() * (EGG_MAX - EGG_MIN));
