import { BrandMark, LilyMark } from './components/BrandMark'

export function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="landing-logo" href="#top" aria-label="Lilya — на главную">
          <BrandMark />
        </a>
        <nav className="landing-nav" aria-label="Навигация по странице">
          <a href="#about">Об игре</a>
          <a href="#how">Как играть</a>
        </nav>
        <button className="button button--landing-header" type="button" onClick={onLogin}>Войти</button>
      </header>

      <main id="top">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <p className="eyebrow">Карточная игра для близких</p>
            <h1 id="landing-title">Узнавайте тех,<br />{' '}кого <em>любите</em></h1>
            <p className="landing-lead">Lilya помогает начать разговор, на который обычно не хватает времени, и услышать друг друга чуть внимательнее.</p>
            <div className="landing-actions">
              <button className="button button--primary" type="button" onClick={onLogin}>Открыть Lilya <span aria-hidden="true">→</span></button>
              <a className="landing-text-link" href="#how">Посмотреть, как это работает</a>
            </div>
            <p className="landing-microcopy">Семья · Пара · Друзья · Вы сами</p>
          </div>

          <div className="landing-hero__visual" aria-label="Карточка Lilya рядом с белой лилией">
            <p className="landing-hero__note">Простые вопросы.<br />Большая близость.</p>
            <article className="landing-question-card">
              <span className="landing-question-card__number">23</span>
              <LilyMark />
              <p>Какой совет ты дал бы себе в сегодняшний возраст?</p>
              <strong>LILYA</strong>
            </article>
            <div className="landing-hero__signature" aria-hidden="true">
              <strong>LILYA</strong>
              <span>ближе к главному</span>
            </div>
          </div>
        </section>

        <section className="landing-intro landing-section" id="about" aria-labelledby="about-title">
          <div className="landing-section__label">
            <span>01</span>
            <p className="eyebrow">О Lilya</p>
          </div>
          <div className="landing-intro__copy">
            <h2 id="about-title">Иногда один вопрос<br />{' '}меняет весь разговор.</h2>
            <p>Lilya — это цифровая колода для спокойных и честных разговоров. Вы выбираете, с кем играете, открываете карточки по одной и двигаетесь в своём темпе.</p>
          </div>
          <dl className="landing-facts">
            <div><dt>240</dt><dd>основных вопросов</dd></div>
            <div><dt>12</dt><dd>тем для разных встреч</dd></div>
            <div><dt>∞</dt><dd>времени, чтобы ответить</dd></div>
          </dl>
        </section>

        <section className="landing-experience landing-section" aria-labelledby="experience-title">
          <div className="landing-section__heading">
            <p className="eyebrow">Путь к более глубокому разговору</p>
            <h2 id="experience-title">Всё внимание —<br />{' '}друг на друга</h2>
          </div>
          <div className="landing-features">
            <article>
              <span>01</span>
              <h3>Выбирайте</h3>
              <p>Откройте две карточки и переверните только ту, на которую хочется ответить сейчас.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Слушайте</h3>
              <p>Делитесь историями без спешки. Любой вопрос можно пропустить — здесь нет правильных ответов.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Сохраняйте</h3>
              <p>Добавляйте важные карточки в избранное и возвращайтесь к ним в следующем разговоре.</p>
            </article>
          </div>
        </section>

        <section className="landing-how" id="how" aria-labelledby="how-title">
          <div className="landing-how__copy">
            <p className="eyebrow">Как играть</p>
            <h2 id="how-title">Начните там,<br />{' '}где вы сейчас</h2>
            <ol>
              <li><span>1</span><p><strong>Выберите близкого человека</strong> и то, какими именами вы будете обращаться друг к другу.</p></li>
              <li><span>2</span><p><strong>Открывайте карточки по очереди.</strong> Каждая глава ведёт разговор чуть глубже.</p></li>
              <li><span>3</span><p><strong>Говорите столько, сколько хочется.</strong> Можно сделать паузу и продолжить позже.</p></li>
            </ol>
          </div>
          <div className="landing-card-scene" aria-label="Колода тёплых бумажных карточек Lilya">
            <div className="landing-card landing-card--olive"><span>Настоящие разговоры остаются</span></div>
            <div className="landing-card landing-card--wine">
              <LilyMark />
              <strong>ХОРОШИЕ<br />ВОПРОСЫ<br />СБЛИЖАЮТ</strong>
            </div>
            <div className="landing-card landing-card--paper">
              <span>01</span>
              <LilyMark />
              <p>Что ты помнишь о нашем самом счастливом дне?</p>
              <strong>LILYA</strong>
            </div>
          </div>
        </section>

        <section className="landing-final" aria-labelledby="final-title">
          <LilyMark />
          <p className="eyebrow">Ближе к главному</p>
          <h2 id="final-title">Разговор, который<br />{' '}хочется сохранить</h2>
          <p>Запись включаете только вы. Аудио остаётся на вашем устройстве и не отправляется на сервер.</p>
          <button className="button button--primary" type="button" onClick={onLogin}>Войти и начать <span aria-hidden="true">→</span></button>
        </section>
      </main>

      <footer className="landing-footer">
        <BrandMark compact />
        <p>Разговоры, которые остаются.</p>
        <button type="button" onClick={onLogin}>Войти</button>
      </footer>
    </div>
  )
}
