import { chapterOps, sceneOps, characterOps, settingsOps } from '../db/operations';

export async function initializeDemoData() {
  // Check if data already exists
  const existingChapters = await chapterOps.getAll();
  if (existingChapters.length > 0) {
    return; // Already initialized
  }

  // Create characters
  const char1 = await characterOps.create(
    '이서윤',
    '28세, 소설가 지망생. 카페에서 아르바이트를 하며 첫 장편소설을 집필 중이다.',
    ['주인공', '여성', '작가']
  );
  
  const char2 = await characterOps.create(
    '강민호',
    '32세, 출판사 편집자. 서윤의 원고를 우연히 발견하고 관심을 갖게 된다.',
    ['조연', '남성', '편집자']
  );
  
  const char3 = await characterOps.create(
    '박지우',
    '55세, 베스트셀러 작가. 서윤의 멘토가 되어준다.',
    ['조연', '여성', '작가', '멘토']
  );

  // Create chapters
  const chapter1 = await chapterOps.create('프롤로그');
  const chapter2 = await chapterOps.create('첫 번째 만남');

  // Create scenes for chapter 1
  await sceneOps.create(chapter1, '카페의 아침', 0);
  await sceneOps.update(
    await sceneOps.create(chapter1, '우연한 발견', 1),
    {
      content: `서윤은 카페 구석 자리에 앉아 노트북을 펼쳤다. 아침 손님들의 웅성거림 속에서도 그녀의 손가락은 키보드 위를 쉴 새 없이 움직였다.

"또 소설 쓰세요?"

단골 손님 중 한 명이 지나가며 물었다. 서윤은 미소를 지으며 고개를 끄덕였다. 3년째 쓰고 있는 이 소설을 아는 사람은 이 카페에만 몇 명이나 될까.

하지만 이번엔 다를 것 같았다. 손끝에서 느껴지는 이 떨림, 이야기가 살아 숨 쉬는 이 감각. 마침내 제대로 된 이야기를 쓰고 있다는 확신이 들었다.`,
      characters: ['이서윤']
    }
  );

  // Create scenes for chapter 2
  await sceneOps.create(chapter2, '출판사에서', 0);
  await sceneOps.update(
    await sceneOps.create(chapter2, '편집자의 제안', 1),
    {
      content: `"이 원고, 어디서 구하셨어요?"

민호는 책상 위에 놓인 원고 뭉치를 손가락으로 두드렸다. 우연히 카페에 두고 간 원고를 읽은 지 이틀, 그는 잠을 설쳤다.

"이건... 출판할 가치가 있어요."

그의 목소리에는 흥분이 섞여 있었다. 10년간 편집자로 일하며 수천 편의 원고를 봤지만, 이런 느낌은 처음이었다.`,
      characters: ['강민호']
    }
  );
  
  await sceneOps.update(
    await sceneOps.create(chapter2, '멘토의 조언', 2),
    {
      content: `"글을 쓴다는 건 말이야," 박지우 작가가 커피잔을 내려놓으며 말했다. "자신의 영혼을 한 글자 한 글자에 담는 일이란다."

서윤은 숨을 죽이고 귀를 기울였다. 베스트셀러 작가의 조언을 들을 수 있는 기회는 흔치 않았다.

"네 원고를 봤어. 재능이 있어. 하지만 재능만으로는 부족해. 끝까지 써내려갈 수 있는 집념, 그게 진짜 작가를 만드는 거야."`,
      characters: ['박지우', '이서윤']
    }
  );

  // Set synopsis
  await settingsOps.set(
    'synopsis',
    `《글을 쓰는 사람들》

소설가를 꿈꾸는 카페 아르바이트생 이서윤이 우연한 기회로 출판계에 발을 들이며 겪는 성장과 도전의 이야기. 

믿음과 좌절, 열정과 현실 사이에서 균형을 찾아가는 젊은 작가의 여정을 그리며, 창작의 고통과 기쁨, 그리고 사람들과의 연결을 통해 진정한 작가로 성장해가는 과정을 담았다.`
  );
}
