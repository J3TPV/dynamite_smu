import React from 'react';
import { Info, BookOpen, Target } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-primary mb-6">About This Site</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary flex items-center gap-2 mb-3">
              <Info size={24} /> Our Mission
            </h3>
            <p className="text-base-content/80">
              To educate and inform about dynamite—a pivotal invention that shaped human civilization. We explore its chemistry, history, applications, and lasting impact on society.
            </p>
          </div>
        </div>

        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary flex items-center gap-2 mb-3">
              <BookOpen size={24} /> What We Cover
            </h3>
            <p className="text-base-content/80">
              From the discovery of nitroglycerin to Alfred Nobel's stabilization of dynamite, we examine the impact, applications, and historical significance of this powerful explosive.
            </p>
          </div>
        </div>

        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary flex items-center gap-2 mb-3">
              <Target size={24} /> Our Focus
            </h3>
            <p className="text-base-content/80">
              Educational exploration of dynamite's role in mining, construction, infrastructure development, and industrial progress. 
            </p>
          </div>
        </div>
      </div>

      <div className="bg-base-200 rounded-xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">Key Facts About Dynamite</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold text-primary mb-1">Inventor: Alfred Nobel</h3>
              <p className="text-base-content/80 text-sm">
                Swedish chemist who discovered how to stabilize nitroglycerin with diatomaceous earth in 1867, creating modern dynamite.
              </p>
            </div>
            
            <div className="border-l-4 border-secondary pl-4">
              <h3 className="font-semibold text-secondary mb-1">Chemical Basis: Nitroglycerin</h3>
              <p className="text-base-content/80 text-sm">
                An oily liquid that is extremely sensitive to shock. Mixing it with an absorbent material makes it safer to handle and transport.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold text-primary mb-1">Power: Enormous Energy Release</h3>
              <p className="text-base-content/80 text-sm">
                A single stick contains enough explosive force to move tons of rock, making it invaluable for mining, quarrying, and heavy construction.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-secondary pl-4">
              <h3 className="font-semibold text-secondary mb-1">Year Invented: 1867</h3>
              <p className="text-base-content/80 text-sm">
                Patent granted in Sweden. The invention quickly spread globally, revolutionizing mining and industrial construction.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold text-primary mb-1">Global Impact: Infrastructure Revolution</h3>
              <p className="text-base-content/80 text-sm">
                Enabled transcontinental railroads, mountain tunnels, dams, and modern cities. Without dynamite, the 20th century would look dramatically different.
              </p>
            </div>
            
            <div className="border-l-4 border-secondary pl-4">
              <h3 className="font-semibold text-secondary mb-1">Nobel Prize Connection</h3>
              <p className="text-base-content/80 text-sm">
                Alfred Nobel's dynamite fortune funded the Nobel Prize, established to recognize contributions to physics, chemistry, medicine, literature, and peace.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary mb-4">Major Applications</h3>
            <ul className="space-y-2 text-base-content/80 text-sm">
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Hard rock mining for precious metals and minerals</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Coal mining and overburden removal</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Mountain tunneling for railways and highways</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Dam and foundation construction</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Quarrying and aggregate extraction</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Avalanche and snow control</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary mb-4">Historical Significance</h3>
            <ul className="space-y-2 text-base-content/80 text-sm">
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>First safe, practical explosive available commercially</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Enabled Industrial Revolution infrastructure projects</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Connected continents through railroads and tunnels</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Revolutionized mining and made deep extraction viable</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Created the foundation for modern mining industry</span>
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-bold">▸</span>
                <span>Legacy includes the Nobel Prize for peace</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-primary mb-4">Conclusion</h2>
        <p className="text-base-content/80 leading-relaxed mb-4">
          The invention of dynamite by Alfred Nobel represents a defining moment in technological history, illustrating how a single innovation can transform multiple aspects of society. From its origins to its widespread use, dynamite has played a crucial role in driving industrial development, advancing scientific knowledge, and shaping applications across education, medicine, media, security, and the military.
        </p>
        <p className="text-base-content/80 leading-relaxed mb-4">
          At the same time, its impact reveals the inherent duality of technology. While dynamite has enabled progress and improved efficiency in many fields, it has also contributed to destruction and conflict when used irresponsibly. This tension highlights a key insight: technology itself is neither good nor bad—it is the intentions and decisions of people that determine its outcomes.
        </p>
       <p className="text-base-content/80 leading-relaxed mb-4">
          Ultimately, dynamite serves as a powerful case study of the responsibilities that come with innovation. As new technologies continue to emerge, its legacy reminds us that progress must be guided not only by capability and profit, but also by ethical considerations and a commitment to the greater good.
        </p>
      </div>
    </div>
  );
};
