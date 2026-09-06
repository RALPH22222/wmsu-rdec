import React, { useState } from 'react';
import { landingContent } from '../data/landingContent';
import { HeroSection } from '../components/HeroSection';
import { AboutSection } from '../components/AboutSection';
import { InteractiveSection } from '../components/InteractiveSection';
import { GuidelinesSection } from '../components/GuidelinesSection';
import { CriteriaSection } from '../components/CriteriaSection';
import { TemplateModal } from '../components/TemplateModal';

interface HomePageProps {
  onSignInClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSignInClick }) => {
  const content = landingContent;
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  return (
    <>
      <HeroSection
        badge={content.hero.badge}
        titlePrefix={content.hero.title_prefix}
        titleHighlight={content.hero.title_highlight}
        description={content.hero.description}
        images={content.hero.images}
        stats={content.stats}
        onSignInClick={onSignInClick}
      />

      <AboutSection
        badge={content.about.badge}
        title={content.about.title}
        description={content.about.description}
        bullets={content.about.bullets}
        imageUrl={content.about.image_url}
      />

      <InteractiveSection
        processSteps={content.process_steps}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        templateDocxUrl={content.templates.research_url}
      />

      <GuidelinesSection
        badge={content.guidelines.badge}
        title={content.guidelines.title}
        description={content.guidelines.description}
        proTip={content.guidelines.pro_tip}
        items={content.guidelines.items}
      />

      <CriteriaSection
        badge={content.criteria.badge}
        title={content.criteria.title}
        description={content.criteria.description}
        items={content.criteria.items}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templateUrl="/DOST_Form_No.1b.pdf"
        templateDocxUrl="/DOST_Form_No.1b.docx"
      />
    </>
  );
};
