import type { ComponentType } from 'react';
import * as foundations from './stories/foundations';
import * as actions from './stories/actions';
import * as overlays from './stories/overlays';
import * as chat from './stories/chat';
import * as catalogStories from './stories/catalog';
import * as scenes from './stories/scenes';

export type DesignSection = 'foundations' | 'actions' | 'overlays' | 'chat' | 'catalog' | 'scenes';

export interface DesignStory {
  id: string;
  section: DesignSection;
  title: string;
  description: string;
  Story: ComponentType;
  Live?: ComponentType;
}

export const SECTION_LABELS: Record<DesignSection, string> = {
  foundations: 'Foundations',
  actions: 'Actions',
  overlays: 'Overlays',
  chat: 'Chat',
  catalog: 'Catalog',
  scenes: 'Scenes',
};

export const SECTION_ORDER: DesignSection[] = [
  'foundations',
  'actions',
  'overlays',
  'chat',
  'catalog',
  'scenes',
];

export const DESIGN_STORIES: DesignStory[] = [
  {
    id: 'logo',
    section: 'foundations',
    title: 'Logo',
    description: 'Eight-circle mark. Gray at rest, used in the sidebar and thinking state.',
    Story: foundations.LogoStory,
  },
  {
    id: 'typography',
    section: 'foundations',
    title: 'Typography',
    description: 'Google Sans Flex. Tight tracking on titles, relaxed body, dense meta.',
    Story: foundations.TypographyStory,
  },
  {
    id: 'colors',
    section: 'foundations',
    title: 'Color tokens',
    description: 'Semantic HSL tokens from index.css. Primary is the product blue.',
    Story: foundations.ColorsStory,
  },
  {
    id: 'avatar',
    section: 'foundations',
    title: 'PersonAvatar',
    description: 'Flux portraits with name-seeded color fallbacks if an image is missing.',
    Story: foundations.AvatarStory,
  },
  {
    id: 'roles',
    section: 'foundations',
    title: 'Role chips',
    description: 'Role colors used on badges and member pills.',
    Story: foundations.RolesStory,
  },
  {
    id: 'thinking',
    section: 'foundations',
    title: 'ThinkingSpinner',
    description: 'Logo plus shimmer while a synth is writing.',
    Story: foundations.ThinkingStory,
  },
  {
    id: 'button',
    section: 'actions',
    title: 'Button',
    description: 'Variant × size matrix. Rounded-full is applied at call sites, not on the primitive.',
    Story: actions.ButtonStory,
  },
  {
    id: 'input',
    section: 'actions',
    title: 'Input',
    description: 'Single-line field used in create, rename, and settings.',
    Story: actions.InputStory,
  },
  {
    id: 'textarea',
    section: 'actions',
    title: 'Textarea',
    description: 'System prompt and longer copy fields.',
    Story: actions.TextareaStory,
  },
  {
    id: 'select',
    section: 'actions',
    title: 'Select',
    description: 'Model picker wired to the live OpenRouter catalog.',
    Story: actions.SelectStory,
  },
  {
    id: 'toggles',
    section: 'actions',
    title: 'Checkbox and Switch',
    description: 'Public-by-default and preference toggles.',
    Story: actions.CheckboxSwitchStory,
  },
  {
    id: 'color-picker',
    section: 'actions',
    title: 'ColorPicker',
    description: 'Chat color for a synth. Presets plus hex.',
    Story: actions.ColorPickerStory,
  },
  {
    id: 'badge-alert',
    section: 'actions',
    title: 'Badge and Alert',
    description: 'Inline labels and a quiet status banner.',
    Story: actions.BadgeAlertStory,
  },
  {
    id: 'dialog',
    section: 'overlays',
    title: 'Dialog',
    description: 'Centered modal surface. Use Live to test the real portal.',
    Story: overlays.DialogStory,
    Live: overlays.DialogLive,
  },
  {
    id: 'alert-dialog',
    section: 'overlays',
    title: 'AlertDialog',
    description: 'Destructive confirm. Use Live to test the real portal.',
    Story: overlays.AlertDialogStory,
    Live: overlays.AlertDialogLive,
  },
  {
    id: 'popover',
    section: 'overlays',
    title: 'Popover',
    description: 'Anchored panel used for model changes and menus.',
    Story: overlays.PopoverStory,
    Live: overlays.PopoverLive,
  },
  {
    id: 'command',
    section: 'overlays',
    title: 'Command',
    description: 'Mention palette. Inline so it exports without a portal.',
    Story: overlays.CommandStory,
  },
  {
    id: 'tooltip',
    section: 'overlays',
    title: 'Tooltip',
    description: 'Hover hint. The artboard shows the surface; Live tests the real tooltip.',
    Story: overlays.TooltipStory,
    Live: overlays.TooltipLive,
  },
  {
    id: 'message',
    section: 'chat',
    title: 'ChatMessage',
    description: 'User bubble and synth replies with role, model, and chat color.',
    Story: chat.MessageStory,
  },
  {
    id: 'continuation',
    section: 'chat',
    title: 'Continuations',
    description: 'Split replies: header on the first bubble, stacked follow-ups, then loading.',
    Story: chat.ContinuationStory,
  },
  {
    id: 'mentions',
    section: 'chat',
    title: 'Mentions',
    description: '@chips and a file mention as they appear in the composer.',
    Story: chat.MentionsStory,
  },
  {
    id: 'members',
    section: 'chat',
    title: 'TeamMembersList',
    description: 'Seated members in the chat header, with remove.',
    Story: chat.MembersStory,
  },
  {
    id: 'member-chips',
    section: 'chat',
    title: 'Member chips',
    description: 'Compact pills used on landing and in the studio preview.',
    Story: chat.MemberChipsStory,
  },
  {
    id: 'composer',
    section: 'chat',
    title: 'Composer',
    description: 'Message input chrome with mention, image, and send.',
    Story: chat.ComposerStory,
  },
  {
    id: 'synth-card',
    section: 'catalog',
    title: 'CustomSynthCard',
    description: 'Sidebar row: portrait, role, model, add and delete.',
    Story: catalogStories.SynthCardStory,
  },
  {
    id: 'group-card',
    section: 'catalog',
    title: 'CustomTeamCard',
    description: 'Group row with stacked member avatars.',
    Story: catalogStories.GroupCardStory,
  },
  {
    id: 'loading',
    section: 'catalog',
    title: 'Loading cards',
    description: 'In-progress synth and group generation rows.',
    Story: catalogStories.LoadingCardsStory,
  },
  {
    id: 'studio',
    section: 'scenes',
    title: 'Studio',
    description: 'Full product slice: catalog, members, thread, composer.',
    Story: scenes.StudioScene,
  },
  {
    id: 'chat-thread',
    section: 'scenes',
    title: 'Chat thread',
    description: 'A seated room mid-conversation.',
    Story: scenes.ChatThreadScene,
  },
  {
    id: 'synth-list',
    section: 'scenes',
    title: 'Synth list',
    description: 'Sidebar catalog as a standalone mockup.',
    Story: scenes.SynthListScene,
  },
  {
    id: 'composer-scene',
    section: 'scenes',
    title: 'Composer scene',
    description: 'Last reply plus the input bar.',
    Story: scenes.ComposerScene,
  },
  {
    id: 'spec-sheet',
    section: 'scenes',
    title: 'Spec sheet',
    description: 'Poster of mark, type, actions, catalog, and chat for a single capture.',
    Story: scenes.SpecSheetScene,
  },
];

export function storiesBySection() {
  return SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    stories: DESIGN_STORIES.filter((story) => story.section === section),
  }));
}

export function findStory(section: string | undefined, id: string | undefined) {
  return DESIGN_STORIES.find((story) => story.section === section && story.id === id);
}

export const DEFAULT_STORY = DESIGN_STORIES[0];
