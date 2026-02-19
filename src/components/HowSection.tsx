import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';

const STEPS = [
  { num: 1, title: 'Describe the role', text: 'Tell Buildor what you need — "a web developer that builds React sites" or "an accountant that manages my invoices." Natural language, no code.' },
  { num: 2, title: 'Agent gets built', text: 'Buildor creates a specialized agent with the right tools, knowledge base, and workflows. Ready in seconds.' },
  { num: 3, title: 'Give it work', text: 'Chat with your agent, assign tasks, or let it run autonomously. It uses Buildor\'s built-in tools — browser, inbox, calendar — to get things done.' },
  { num: 4, title: 'Scale infinitely', text: 'Need more? Create another agent. Your AI workforce grows with your business — no hiring, no training, no overhead.' },
];

export function HowSection(): JSX.Element {
  const [activeStep, setActiveStep] = useState(0);
  const headerRef = useReveal<HTMLDivElement>();
  const stepsRef = useReveal<HTMLDivElement>();
  const chatRef = useReveal<HTMLDivElement>();

  return (
    <section className="how-section" id="how">
      <div className="wrap">
        <div className="how-header rv" ref={headerRef}>
          <div className="section-label">How It Works</div>
          <div className="section-title">
            Three steps to your <span className="cyan-accent">AI team</span>.
          </div>
        </div>
        <div className="how-grid">
          <div className="how-steps rv rv-d1" ref={stepsRef}>
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`how-step ${activeStep === i ? 'active' : ''}`}
                onClick={() => setActiveStep(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveStep(i)}
                role="button"
                tabIndex={0}
              >
                <div className="step-num">{step.num}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="how-chat rv rv-d2" ref={chatRef}>
            <div className="chat-msg chat-user">
              I need a marketing agent that handles our social media and writes blog posts weekly
            </div>
            <div className="chat-msg chat-bot">
              Got it! Creating a Marketing Agent with social media management + content writing skills. Setting up access to your accounts...
            </div>
            <div className="chat-msg chat-bot">
              ✓ Agent &quot;MarketingPro&quot; is ready.
              <br />
              → Connected: Twitter, LinkedIn, Blog
              <br />
              → Schedule: Posts daily, blog weekly
              <br />
              → First draft ready for review!
            </div>
            <div className="chat-msg chat-user">Perfect, start now. 🚀</div>
            <div className="chat-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowSection;
