import React from 'react';
import { Users, TrendingUp, Leaf, Cpu } from 'lucide-react';

interface ImpactsProps {
  subPage?: string;
}

export const Impacts: React.FC<ImpactsProps> = ({ subPage }) => {
  if (subPage === 'social') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <Users size={40} /> Social Impact
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Infrastructure & Social Progress</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite enabled large-scale infrastructure projects such as railways, canals, and tunnels, accelerating industrialization. This improved access to healthcare, education, and transportation, connecting rural areas to urban economic centers and raising overall living standards.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Worker Safety Improvements</h2>
              <p className="text-base-content/80 leading-relaxed">
                By stabilizing nitroglycerin, dynamite made blasting significantly safer and more efficient. This reduced accidental explosions and workplace fatalities, particularly in mining and construction, improving conditions for workers during industrial expansion.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Militarization & Social Instability</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite’s use in warfare intensified destruction through bombs, artillery shells, and landmines, leading to mass casualties and long-term psychological trauma. Its adoption by anarchists and terrorist groups further heightened social unrest and public fear.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Environmental & Societal Consequences</h2>
              <p className="text-base-content/80 leading-relaxed">
                Extensive use of dynamite contributed to environmental degradation, including habitat destruction and pollution. These impacts led to stricter regulations and oversight of explosives to reduce long-term harm to ecosystems and communities.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'economic') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <TrendingUp size={40} /> Economic Impact
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Resource Extraction & Industrial Growth</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite significantly reduced the cost and difficulty of mining by enabling efficient access to deep mineral deposits. This boosted production of coal, metals, and other critical resources, lowering energy costs, accelerating industrial output, and supporting large-scale economic expansion.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Job Creation & Economic Expansion</h2>
              <p className="text-base-content/80 leading-relaxed">
                The increased efficiency in mining and resource extraction created employment opportunities across sectors such as mining, transportation, and logistics. This contributed to economic growth in industrial regions, particularly across Europe and the Americas.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Infrastructure & Global Trade Integration</h2>
              <p className="text-base-content/80 leading-relaxed">
              Dynamite enabled the construction of complex infrastructure projects like highways, tunnels, and ports, especially in difficult terrains. These developments enhanced connectivity, facilitated global trade, and strengthened economic integration between regions.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Market Growth & Structural Shifts</h2>
              <p className="text-base-content/80 leading-relaxed">
                The dynamite and explosives market continues to grow, projected to rise from USD 18.5 billion in 2024 to USD 24 billion by 2030, driven by urbanization and mining demand. However, increased mechanization reduced reliance on manual labor, forcing local economies to adapt to changing workforce demands.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'environmental') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <Leaf size={40} /> Environmental Impact
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Landscape Transformation</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite enabled massive excavation of rock and earth, permanently transforming landscapes. Mountains were tunneled, valleys were filled, and quarries created. While enabling development, this had significant environmental consequences.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Mining Impacts</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite enabled large-scale mining that extracted valuable minerals but left behind tailings, contaminated water, and disrupted ecosystems. Mining communities often faced significant environmental degradation and health impacts.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Habitat Disruption</h2>
              <p className="text-base-content/80 leading-relaxed">
                Construction projects using dynamite destroyed natural habitats, forest ecosystems, and wildlife corridors. The rapid development of railroads and infrastructure came at significant cost to natural environments and biodiversity.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">Water and Soil Contamination</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite production and mining operations created chemical pollution. Nitroglycerin residues and heavy metals from mining poisoned water supplies and contaminated soil in many regions, with effects lasting for generations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Technological impact
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
        <Cpu size={40} /> Technological Impact
      </h1>
      <div className="space-y-6">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">Breakthrough in Explosives Engineering</h2>
            <p className="text-base-content/80 leading-relaxed">
              Dynamite introduced a stable combination of nitroglycerin and kieselguhr, along with the blasting cap, creating a reliable and controllable detonation system. This set new engineering standards and replaced unstable explosives like pure nitroglycerin.
            </p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">Enabling Complex Civil Engineering Feats</h2>
            <p className="text-base-content/80 leading-relaxed">
              With its improved stability and power, dynamite made large-scale projects such as mountain tunneling and river dredging feasible. These advancements surpassed the limitations of black powder, expanding the boundaries of infrastructure development.
            </p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">Evolution into Modern Explosives Technology</h2>
              <p className="text-base-content/80 leading-relaxed">
              Dynamite paved the way for advanced explosives like emulsion explosives and electronic detonators. These innovations offer greater precision, enhanced safety, and reduced environmental impact in modern mining, construction, and demolition.
            </p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">Broader Technological Impact & Legacy</h2>
            <p className="text-base-content/80 leading-relaxed">
              The principles behind dynamite influenced technologies beyond construction, including aerospace propellants and sustainable mining solutions. Additionally, Alfred Nobel’s wealth from dynamite funded the Nobel Prizes, supporting ongoing innovation and scientific advancement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
