import React from 'react';
import { Pickaxe, Zap, Shield, Newspaper, Bomb, Drama, Smile, GamepadIcon, Eye, Circle, FlaskConical, Activity, Book, BookAlert, HandCoins, Castle, CastleIcon, Pill, BrainCircuit, BriefcaseMedical, PillBottle, BookOpen, Biohazard, ChartArea, Scale, Sword, AArrowUp, ShieldEllipsis, PencilRuler, Cog} from 'lucide-react';

interface ApplicationsProps {
  subPage?: string;
}

export const Applications: React.FC<ApplicationsProps> = ({ subPage }) => {
  if (subPage === 'specialized') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <Newspaper size={40} /> Applications of Dynamite in Media
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Drama size={24} /> Symbol of Destruction & Drama
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite is commonly used in media as a visual symbol of danger, destruction, and high-stakes action. Its distinctive appearance makes it an easily recognizable shorthand for explosive impact in storytelling.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Smile size={24} /> Simplified & Comedic Portrayals
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                In cartoons like Looney Tunes, dynamite is often depicted in exaggerated and humorous ways, such as through characters like Wile E. Coyote. These portrayals simplify its real-world effects, turning a dangerous tool into a comedic device.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <GamepadIcon size={24} /> Interactive Use in Gaming
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                In video games like Minecraft, dynamite-inspired elements such as TNT are used for both destruction and creativity. Players can strategically apply them for mining, building, or combat, blending entertainment with simplified mechanics of explosives.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Eye size={24} /> Influence on Public Perception
                </h2>
              <p className="text-base-content/80 leading-relaxed">
                Media representations can make explosives appear more accessible and less dangerous than they are in reality. While this enhances entertainment value, it may reduce public awareness of the serious risks and consequences associated with real-world explosive use.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'construction') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <Zap size={40} /> Applications of dynamite in industry
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Circle size={24} /> Core Role in Underground Mining</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite is primarily used in mining due to its high explosive power, making it effective for breaking rock and accessing underground mineral deposits. It replaced black powder, which was less powerful and posed greater risks in mining environments.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Shield size={24} /> Improved Safety Over Early Explosives</h2>
              <p className="text-base-content/80 leading-relaxed">
                Unlike black powder, which produces flames that can trigger dust explosions, dynamite provides a more controlled and safer blasting method. This significantly reduced the risk of accidental explosions in underground mining operations.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <FlaskConical size={24} /> Customised Industrial Formulations</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite has been modified over time to meet specific industrial needs. Variants have been developed to reduce toxic gas emissions such as carbon monoxide and nitrogen dioxide, improving safety for workers after blasting.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Activity size={24} /> Adaptability to Harsh Conditions</h2>
              <p className="text-base-content/80 leading-relaxed">
                Specialized forms of dynamite are designed to function in extreme conditions, including low temperatures. This adaptability ensures consistent performance across different mining environments and operational challenges.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'medicine') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <Pill size={40} /> Applications of Dynamite in Medicine
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <PillBottle size={24} /> Medical Use of Nitroglycerin</h2>
              <p className="text-base-content/80 leading-relaxed">
               While dynamite itself is not used in medicine, its key component, nitroglycerin, is widely used to treat angina. It works by relaxing blood vessels, improving blood flow, and increasing oxygen supply to the heart.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <BriefcaseMedical size={24} /> From Explosives to Life-Saving Treatment</h2>
              <p className="text-base-content/80 leading-relaxed">
                Nitroglycerin demonstrates how a substance originally developed for explosive purposes can be repurposed into a critical medical treatment. This transformation highlights the adaptability of chemical compounds across different fields.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <FlaskConical size={24} /> Dual-Use Nature of Chemistry</h2>
              <p className="text-base-content/80 leading-relaxed">
                The use of nitroglycerin in both explosives and medicine illustrates the dual-use nature of chemistry, where the same substance can either harm or heal depending on its application.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <BrainCircuit size={24} /> Ethical Implications in Scientific Discovery</h2>
              <p className="text-base-content/80 leading-relaxed">
                This case reinforces the importance of ethical responsibility in science, emphasizing that the societal impact of a discovery depends on how it is applied, not just how it is created.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'security') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <Shield size={40} /> Applications of Dynamite in Security
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Biohazard size={24} /> Controlled Demolition & Hazard Management
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite is used in controlled demolitions to safely dismantle unstable structures or clear hazardous environments. Security and engineering teams apply precise explosive techniques to minimize risk and protect surrounding areas.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Bomb size={24} /> Bomb Disposal & Threat Neutralization
              </h2>
              <p className="text-base-content/80 leading-relaxed">
               Knowledge of dynamite and similar explosives is essential for bomb disposal units. Controlled detonations are used to neutralize suspicious devices, allowing authorities to manage threats in a safe and controlled manner.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <ChartArea size={24} /> Advancements in Detection Technology
              </h2>
              <p className="text-base-content/80 leading-relaxed">
               The study of explosives like dynamite has led to the development of detection systems such as explosive trace detectors. These technologies are widely used in airports and high-security areas to identify and prevent potential threats.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Scale size={24} /> Regulation & Misuse Prevention
                </h2>
              <p className="text-base-content/80 leading-relaxed">
                Due to its misuse in sabotage and terrorism, dynamite is subject to strict regulations and monitoring. Governments enforce control measures to balance its legitimate use in security and industry with the need to prevent illegal activities.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (subPage === 'military') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
          <Sword size={40} /> Applications of dynamite in military
        </h1>
        <div className="space-y-6">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <Cog size={24} /> Military Engineering & Demolition</h2>
              <p className="text-base-content/80 leading-relaxed">
                Dynamite was primarily used by military engineers to destroy infrastructure such as bridges, tunnels, and supply routes. This helped disrupt enemy movement and logistics, particularly during World War I and World War II.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <PencilRuler size={24} /> Battlefield Construction & Mobility</h2>
              <p className="text-base-content/80 leading-relaxed">
              Dynamite was also used to construct defensive positions, clear obstacles, and create pathways through difficult terrain. Its reliability allowed armies to modify environments quickly to gain tactical advantages.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <ShieldEllipsis size={24} /> Reliability in Early Warfare Operations</h2>
              <p className="text-base-content/80 leading-relaxed">
                Compared to earlier explosives, dynamite offered greater stability and controlled detonation, making it a dependable tool for military operations involving engineering and demolition tasks.
              </p>
            </div>
          </div>
          <div className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-secondary mb-3">
                <AArrowUp size={24} /> Transition to Advanced Explosives</h2>
              <p className="text-base-content/80 leading-relaxed">
                Over time, dynamite was replaced by more powerful and versatile explosives such as TNT and C4. Despite this, its early use laid the foundation for modern military engineering and influenced the evolution of warfare strategies.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Applications of dynamite in education
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">
        <BookOpen size={40} /> Applications of dynamite in education
      </h1>
      <div className="space-y-6">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">
              <Book size={24} /> Teaching Chemical Stability & Innovation</h2>
            <p className="text-base-content/80 leading-relaxed">
              Dynamite is widely used in education as a case study in chemical stability, demonstrating how volatile substances like nitroglycerin can be stabilized for practical use. It highlights key principles in chemistry, engineering, and innovation.
            </p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">
              <BookAlert size={24} /> Ethics of Dual-Use Technology</h2>
            <p className="text-base-content/80 leading-relaxed">
              Dynamite illustrates the ethical dilemma of dual-use technology, where a single invention can benefit society through infrastructure development while also causing harm through military applications. This makes it a powerful example in ethics education.
            </p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">
              <HandCoins size={24} /> Profit vs Principle Debate</h2>
            <p className="text-base-content/80 leading-relaxed">
              Alfred Nobel’s experience reflects the tension between financial success and moral responsibility. While dynamite brought him wealth through industrial and military uses, it also raised questions about the ethical cost of such profits.
            </p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary mb-3">
              <CastleIcon size={24} /> Legacy & Responsibility in Innovation</h2>
            <p className="text-base-content/80 leading-relaxed">
              The story of dynamite encourages discussions about the responsibilities of inventors and innovators. It emphasizes the importance of considering long-term societal impacts when developing new technologies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
