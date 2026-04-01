
export interface AdSet {
  type: string;
  budget_split: string;
  ads: number;
}

export interface StoryboardShot {
  shot_number: number;
  angle: string;
  framing: string;
  action: string;
  pre_production_note: string;
}

export interface LaunchStep {
  day: string;
  action: string;
  metric_to_watch: string;
}

export interface AdStrategy {
  category: string;
  product: string;
  price: string;
  payment_type: string;
  delivery_area: string;
  daily_budget: string;
  objective: string;
  max_cpa: string;
  page_status: string;
  experience_level: string;
  campaign_structure: {
    campaign_type: string;
    ad_sets: AdSet[];
  };
  targeting_logic: {
    primary: string;
    secondary: string;
  };
  creative_angles: string[];
  hooks: {
    text: string;
    psychological_trigger: string;
  }[];
  storyboard: StoryboardShot[];
  pre_production_checklist: string[];
  video_script: {
    scene: string;
    visual: string;
    audio: string;
  }[];
  captions: {
    short_punchy: string[];
    story_based: string;
    benefit_driven: string[];
    psychology_note: string;
  };
  launch_roadmap: LaunchStep[];
  technical_setup_vault: {
    pixel_event: string;
    custom_conversion: string;
    tracking_parameter: string;
  };
  optimization_rules: {
    pause_if_cpa_above: string;
    scale_if_ctr_above: string;
    do_not_touch_hours: number;
  };
  visual_moodboard_prompt: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface ProductLabResult {
  description: string;
  images: string[];
}

export interface AuditResult {
  score: number;
  scores?: Record<string, number>;
  summary: string;
  weaknesses: {
    title: string;
    issue: string;
    impact: 'High' | 'Medium' | 'Low';
  }[];
  suggestions: string[];
  conversion_roadmap: {
    step: string;
    action: string;
    expected_result: string;
  }[];
  competitor_comparison: string;
  grounding_sources?: { title: string; uri: string }[];
}
