# Demo Script and Pitch: SachCheck

## 1. 60-second demo flow

| Time | Say | Show |
|---|---|---|
| 0:00-0:10 | "Every family has that one forward. Everyone sees it, nobody knows how to correct it politely." | Mock family group with a viral hoax message |
| 0:10-0:25 | "SachCheck sits quietly in the group. It only looks at messages that make factual claims." | Message posted; dashboard shows the claim gate result |
| 0:25-0:40 | "It checks existing fact-checks, tells you why the message feels believable, and says honestly when it can't verify." | Dashboard: verdict, sources, manipulation tactics |
| 0:40-0:55 | "Nothing is posted without the person who installed it approving. One tap sends a polite correction in the same language." | Private nudge on the phone, tap **Send polite correction**, reply appears in the group |
| 0:55-1:00 | "We don't just detect fake news. We help people correct it without fighting with family." | Logo and tagline |

## 2. Three examples to prepare (cache them)

1. **Text hoax** (Hinglish): chain-forward message that creates urgency. Shows the tactic breakdown and Hinglish reply.
2. **Out-of-context image**: an old photo with a new false caption. Shows earliest appearance (hero moment).
3. **Unverified case**: an obscure rumour. Shows honest uncertainty and that the bot stays quiet instead of accusing.

Verify each example with real sources before the demo and keep the links ready.

## 3. Opening line options

- Hook with a relatable moment: "How many of you have a relative who forwards things you know are wrong?"
- Add one verified statistic about misinformation spread in India. **Find a recent statistic from a reputable source and cite it on the slide; do not quote a number from memory.**

## 4. Slide outline (6 slides)

1. Problem: forwards in family groups
2. Why existing tools fall short (English-first, verdict only, text only)
3. Our approach: claim gate, evidence, tactics, polite reply, human approval
4. Live demo
5. Architecture (one diagram from `ARCHITECTURE.md`) and stack
6. Roadmap: forward-to-bot tipline on the official WhatsApp Business API, regional languages, voice notes

## 5. Likely judge questions and answers

| Question | Answer |
|---|---|
| Doesn't reading group messages violate privacy? | The bot announces itself in the group, stores only what it needs, hashes sender IDs, never auto-posts, and has a delete-data action. |
| Is the WhatsApp approach allowed? | The group-member bot is unofficial and is only our demo path. The production-safe paths are the Telegram bot and a forward-to-bot tipline via the official WhatsApp Business API. |
| How accurate is it? | It grounds verdicts in retrieved fact-checks, shows its sources, and returns "can't verify yet" instead of guessing. We test against a fixture set after each prompt change. |
| What happens when it's wrong? | The Installer reviews every nudge before anything is posted, and low-confidence cases never trigger a nudge. |
| How is this different from existing tipline bots? | They return a verdict on request. We detect claims in the group, explain the manipulation tactics, and generate the polite correction with human approval. |
| Can it scale? | The AI service is stateless and cached by message hash; channels are adapters, so adding platforms or languages does not change the core. |

## 6. Demo-day checklist

- [ ] Phone charged, screen mirroring tested
- [ ] Cached examples preloaded
- [ ] Backup video ready
- [ ] Telegram demo as plan B
- [ ] One teammate narrates while another drives
