import React from 'react';
import { Zap, Beaker, Lightbulb, Search } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-8 mb-12 items-center">
        <div className="order-2 md:order-1">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            One of the most powerful explosives ever created
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-secondary mb-6">
            Dynamite
          </h2>
          <p className="text-lg text-base-content/80 leading-relaxed">
            Dynamite has profoundly shaped modern civilization through construction, mining, and engineering. From tunneling through mountains to excavating foundations, its controlled explosive power has made possible the infrastructure that supports our world. From civil engineering to quarrying, dynamite remains one of the most transformative discoveries of the industrial age.
          </p>
        </div>
        <div className="order-1 md:order-2 flex justify-center">
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg p-8 text-center">
            <Search size={120} className="text-primary mx-auto mb-4" />
            <p className="text-base-content/70 font-semibold">Let's Dive Deep into Dynamite :D</p>
          </div>
        </div>
      </div>

      {/* How Does It Work Section */}
      <div className="bg-base-200 rounded-xl p-8 md:p-12 mb-12">
        <h2 className="text-3xl font-bold text-primary mb-8">How does dynamite work?</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-secondary flex items-center gap-2">
              <Beaker size={24} /> The Chemistry of Dynamite
            </h3>
            <p className="text-base-content/80 leading-relaxed">
              Dynamite is a nitroglycerin-based explosive developed in 1867. Nitroglycerin is an extremely sensitive liquid that is stabilized by mixing it with an absorbent substance such as diatomaceous earth. This combination creates a paste-like explosive that is much safer to handle and transport than pure nitroglycerin.
            </p>
            <p className="text-base-content/80 leading-relaxed">
              The molecular structure of nitroglycerin contains nitrogen, carbon, and oxygen atoms bonded together under tremendous chemical stress. When a shock or heat triggers the explosive, these bonds break violently, releasing enormous amounts of energy in a fraction of a second.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-secondary flex items-center gap-2">
              <Lightbulb size={24} /> How Energy is Released
            </h3>
            <p className="text-base-content/80 leading-relaxed">
              Dynamite works through a rapid chemical reaction that converts solid material into hot gases at supersonic speeds. A small detonator provides the spark needed to trigger the main charge, which then propagates through the entire stick in milliseconds.
            </p>
            <p className="text-base-content/80 leading-relaxed">
              The resulting explosion generates extreme pressure and heat. This controlled release of energy can move tons of rock or earth, making it invaluable for construction, mining, and engineering projects where precision excavation is required.
            </p>
          </div>
        </div>
      </div>

      {/* Key Facts */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary">Powerful Force</h3>
            <p className="text-base-content/70">A single stick of dynamite releases energy equivalent to thousands of pounds of TNT, making it perfect for heavy excavation work.</p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary">Diverse Applications</h3>
            <p className="text-base-content/70">Mining, construction, demolition, quarrying, and tunneling all depend on dynamite's precise and controllable power.</p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-primary">Industrial Essential</h3>
            <p className="text-base-content/70">Dynamite enabled the creation of roads, railroads, dams, and tunnels that form the backbone of modern infrastructure.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
