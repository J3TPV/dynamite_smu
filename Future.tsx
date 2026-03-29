import React from 'react';
import { Rocket, Lightbulb, TrendingUp, FishOff, Skull, ChartArea } from 'lucide-react';

export const Future: React.FC = () => {
  const innovations = [
    {
      icon: <Rocket className="text-primary" size={32} />,
      title: 'Escalation of Warfare',
      description: 'Dynamite significantly enhanced military capabilities by enabling the destruction of strong defensive structures such as stone fortifications. Although intended for civilian and industrial use, it contributed to more efficient and large-scale killing.'
    },
    {
      icon: <Skull className="text-secondary" size={32} />,
      title: 'Modern Terrorism',
      description: 'Dynamite introduced a new era of political violence where non-state actors could carry out large-scale attacks on infrastructure and individuals.'
    },
    {
      icon: <FishOff className="text-primary" size={32} />,
      title: 'Environmental Destruction',
      description: 'Dynamite is used in illegal blast fishing, which maximizes short-term catch but causes severe long-term environmental damage. It destroys marine ecosystems and harms non-target species.'
    },
    {
      icon: <ChartArea className="text-secondary" size={32} />,
      title: 'Acceleration of Industrial and Economic Development',
      description: 'Dynamite enabled faster and more efficient construction, mining, and infrastructure development. It reduced labor time and costs, making large-scale projects economically viable and accelerating industrial growth worldwide.'
    },
    // {
    //   icon: <Lightbulb className="text-primary" size={32} />,
    //   title: 'Sustainable Mining',
    //   description: 'Research into less wasteful blasting techniques and safer alternative explosives aims to reduce the environmental footprint of mining while maintaining productivity and profitability.'
    // },
    // {
    //   icon: <TrendingUp className="text-secondary" size={32} />,
    //   title: 'Deep Underground Storage',
    //   description: 'Blasting technology is being adapted for creating massive underground storage facilities for geological sequestration of carbon dioxide and long-term waste storage solutions.'
    // }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-primary mb-4">The Implications of Dynamite</h1>
      <p className="text-lg text-base-content/80 mb-12">
        Dynamite had far-reaching implications that reshaped both human progress and destruction. While it accelerated industrial and economic development by enabling efficient construction and mining, it also intensified warfare and introduced new forms of terrorism through its powerful destructive capabilities. Additionally, its misuse, such as in blast fishing, has caused severe environmental damage, highlighting the dual nature of dynamite as both a tool for advancement and a source of harm.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {innovations.map((innovation, index) => (
          <div key={index} className="card bg-base-200 shadow-md hover:shadow-lg transition">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">{innovation.icon}</div>
                <div className="flex-1">
                  <h3 className="card-title text-lg mb-2">{innovation.title}</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">{innovation.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">Looking Ahead: 2030-2050</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="text-secondary font-bold text-lg">2025-2030</div>
            <div>
              <h3 className="font-semibold text-primary mb-1">Transition Period</h3>
              <p className="text-base-content/80">
                Stricter environmental regulations drive adoption of alternative explosives. Electronic detonation systems become standard. Automation in mining operations increases significantly.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="text-secondary font-bold text-lg">2030-2040</div>
            <div>
              <h3 className="font-semibold text-primary mb-1">Advanced Alternatives</h3>
              <p className="text-base-content/80">
                Next-generation explosives with reduced environmental impact dominate new mining projects. AI-powered blast planning optimizes fragmentation and reduces waste. Remote operation becomes standard.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="text-secondary font-bold text-lg">2040-2050</div>
            <div>
              <h3 className="font-semibold text-primary mb-1">Sustainable Mining Era</h3>
              <p className="text-base-content/80">
                Emphasis on circular mining, waste reduction, and environmental restoration. Explosives technology focuses on precision and minimal ecological impact. Traditional dynamite largely limited to heritage applications.
              </p>
            </div>
          </div>
        </div>
      </div> */}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-base-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-primary mb-4">Legacy of Dynamite</h3>
          <p className="text-base-content/80 mb-4">
            While dynamite may decline in future use, its historical importance cannot be overstated. It enabled the industrial revolution, created modern infrastructure, and connected the world. Alfred Nobel's invention fundamentally shaped our civilization.
          </p>
          <p className="text-base-content/70 text-sm">
            Understanding dynamite's role in history helps us appreciate both the progress it enabled and the environmental challenges it created—lessons essential for developing better technologies.
          </p>
        </div>

        <div className="bg-base-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-primary mb-4">Challenges Ahead</h3>
          <p className="text-base-content/80 mb-4">
            Mining and construction industries face pressure to reduce environmental impact while maintaining economic viability. Safety concerns and regulatory compliance drive innovation in explosive technology and blasting practices.
          </p>
          <p className="text-base-content/70 text-sm">
            The future requires balancing resource extraction needs with environmental responsibility—a challenge that will drive engineering innovation for decades to come.
          </p>
        </div>
      </div>
    </div>
  );
};
