import React from 'react';
import { Clock, Lightbulb } from 'lucide-react';

export const HistoryEvolution: React.FC = () => {
  const milestones = [
    {
      year: '1847',
      title: 'Nitroglycerin Discovery',
      description: 'Italian chemist Ascanio Sobrero discovers nitroglycerin by combining glycerol with nitric and sulfuric acids. The substance is extremely powerful but dangerously unstable, making it impractical for safe use.'
    },
    {
      year: '1850s–1860s',
      title: 'Early Experiments and Failures',
      description: 'Scientists and engineers attempt to use nitroglycerin for construction and mining. Frequent accidental explosions result in injuries and deaths, highlighting the urgent need for a safer alternative.'
    },
    {
      year: 'Late 1800s–Early 1900s',
      title: 'Expansion of Mining and Resource Extraction',
      description: 'Dynamite made deep mining viable. Coal, gold, silver, and other minerals became easier to extract, fueling industrial economies. It also quietly set the stage for resource depletion and environmental damage that future generations would inherit. Lucky them.'
    },
    {
      year: '1866-1867',
      title: 'Dynamite Invention',
      description: 'In 1866, Swedish chemist Alfred Nobel stabilizes nitroglycerin by mixing it with diatomaceous earth, creating a paste that can be shaped and handled more safely. In 1867, he patents this invention as “dynamite,” marking a turning point in explosive technology.'
    },
    {
      year: '1870s–1880s',
      title: 'Industrial Adoption',
      description: 'Dynamite becomes widely used in mining, railway construction, and tunnel engineering. It allows for faster and more efficient excavation, supporting the rapid expansion of infrastructure during the Industrial Revolution.'
    },
    {
      year: '1890s–1920s',
      title: 'Global Expansion and Standardization',
      description: 'Production of dynamite spreads worldwide. Standardized dynamite sticks and improved fuse systems make blasting more controlled and predictable, increasing its reliability across industries.'
    },
     {
      year: '1930s–1950s',
      title: 'Advancements in Detonation Technology',
      description: 'Electric detonators and improved blasting techniques are developed, allowing for precise timing and safer large-scale operations. Dynamite remains a dominant industrial explosive.'
    },
         {
      year: '1960s–1980s',
      title: 'Emergence of Alternative Explosives',
      description: 'New explosives such as ANFO (ammonium nitrate fuel oil) begin replacing dynamite in large-scale mining due to lower cost and greater stability. Dynamite use gradually declines in heavy industry.'
    },
         {
      year: '1990s–Present',
      title: 'Modern Role and Specialized Use',
      description: 'Dynamite continues to be used in smaller-scale construction, controlled demolition, and specialized blasting where precision is required. Strict safety regulations and handling procedures define its modern use.'
    },
    // {
    //   year: '1970s-Present',
    //   title: 'Modern Evolution',
    //   description: 'Newer explosives like ANFO and RDX are developed for specialized applications, but dynamite remains important in traditional mining and construction. Advanced safety regulations and handling procedures continue to evolve.'
    // }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-primary mb-4">The History and Evolution of Dynamite</h1>
      <p className="text-lg text-base-content/80 mb-12">
        From a volatile chemical accident to a foundation of modern explosives, dynamite evolved alongside human ambition to control destruction.
      </p>

      <div className="space-y-6">
        {milestones.map((milestone, index) => (
          <div key={index} className="card bg-base-200 shadow-md hover:shadow-lg transition">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-content rounded-full p-3 flex-shrink-0">
                  <Clock size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-primary mb-1">{milestone.year}</h3>
                  <h4 className="text-xl font-semibold text-secondary mb-3">{milestone.title}</h4>
                  <p className="text-base-content/80 leading-relaxed">{milestone.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8 mt-12">
        <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
          <Lightbulb size={28} /> Key Innovations
        </h2>
        <ul className="space-y-3 text-base-content/80">
          <li className="flex gap-3">
            <span className="text-secondary font-bold">•</span>
            <span><strong>Industrial Growth vs. Environmental Cost:</strong> Dynamite enabled massive infrastructure and economic development, but also accelerated deforestation, mining damage, and landscape destruction</span>
          </li>
          <li className="flex gap-3">
            <span className="text-secondary font-bold">•</span>
            <span><strong>Human Safety Improvement:</strong> Compared to raw nitroglycerin, dynamite significantly reduced accidental deaths. Not safe, just… less immediately catastrophic</span>
          </li>
          <li className="flex gap-3">
            <span className="text-secondary font-bold">•</span>
            <span><strong>Economic Transformation:</strong> Lower costs of construction and mining reshaped global trade, urbanization, and industrial economies</span>
          </li>
          <li className="flex gap-3">
            <span className="text-secondary font-bold">•</span>
            <span><strong>Moral Paradox:</strong> Alfred Nobel created dynamite to improve industry, then watched explosives contribute to warfare. That existential crisis literally led to the creation of the Nobel Prizes. Guilt, but make it philanthropic</span>
          </li>
          <li className="flex gap-3">
            <span className="text-secondary font-bold">•</span>
            <span><strong>Foundation for Modern Explosives:</strong> Dynamite laid the groundwork for controlled blasting technologies used today in engineering, demolition, and even space-related infrastructure</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
