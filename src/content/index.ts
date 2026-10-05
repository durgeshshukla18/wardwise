// The shipped content as typed data. `npm run validate-content` and tests check the JSON against
// the schemas, so the app does not bundle zod just to parse it again.
import itemsJson from './items.json';
import topicsJson from './topics.json';
import type { Item, TopicEntry, TopicId } from './schema.ts';

export const items = itemsJson as unknown as Item[];
export const topics = topicsJson as unknown as TopicEntry[];

export function topicName(topic: TopicId): string {
  return topics.find((entry) => entry.id === topic)?.name ?? topic;
}
