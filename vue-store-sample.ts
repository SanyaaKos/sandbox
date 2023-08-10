// useItemStore.ts

// The purpose of this store is to give access to app components to to the input data provided by backend
// Data is coming as array of objects - Array<IItem>

import { defineStore } from "pinia";
import { ref, computed } from "vue";

import { useSummaryStore } from "@/stores/useSummaryStore";
import type {
  IItem,
  IItemModified,
  IProgress,
  ItemsByTopics,
} from "@/types";
import { NUMBER_OF_STATIC_TOPICS } from "@/utils/constants";
import { getProgress } from "@/utils/helpers";

export const useItemsStore = defineStore("items", () => {
  // The additional store for results logic
  const summaryStore = useSummaryStore();

  // Local ref for storing input data with necessary modifications
  const modifiedItems = ref<IItemModified[]>([]);

  // This method is called from component when data is loaded
  // The necessarry key-values with defaults are added
  const setCopyOfItems = (payload: IItem[]): void => {
    modifiedItems.value = payload.map((item: IItem) => {
      return {
        ...item,
        score: null,
        comment: null,
        fulfilled: true,
      };
    });
    summaryStore.initSummaryStore(modifiedItems.value);
  };

  // This is used to create the list of headings for navigation purposes (scroll to element)
  const topicHeadingsRefs = ref<Record<string, HTMLElement>>({});
  const itemHeadingsRefs = ref<Record<string, HTMLElement>>({});

  // These methods are called from components to populate the above lists
  const setTopicHeadingsRefs = (
    topicKey: string,
    value: HTMLElement
  ): void => {
    topicHeadingsRefs.value[topicKey] = value;
  };

  const setItemHeadingsRefs = (
    topicIndex: number,
    itemIndex: number,
    value: HTMLElement
  ): void => {
    const index = `${topicIndex}.${itemIndex + 1}`;
    itemHeadingsRefs.value[index] = value;
  };

  // Get the array of unique topics
  const itemTopicKeys = computed<string[]>(() => {
    return [
      ...new Set(
        modifiedItems.value.map(
          (item: IItemModified) => item.topicKey
        )
      ),
    ];
  });

  // Group topic items by topic
  const itemTopicTitles = computed<{ [key: string]: string }>(() => {
    return itemTopicKeys.value.reduce((acc, topicKey: string) => {
      return {
        ...acc,
        [topicKey]: modifiedItems.value.find(
          (item: IItemModified) => item.topicKey === topicKey
        )?.topicTitle,
      };
    }, {});
  });

  // Expand/collapse functionality
  const isItemsTopicExpanded = ref<{ [key: string]: boolean }>({});

  // Computing the array of items for rendering
  const itemsByTopics = computed<ItemsByTopics[]>(() => {
    isItemsTopicExpanded.value = {};
    return itemTopicKeys.value.map(
      (topicKey: string, index: number) => {
        const id = index + 1 + NUMBER_OF_STATIC_TOPICS;
        isItemsTopicExpanded.value[id.toString()] = false;
        return {
          topicKey,
          items: modifiedItems.value.filter(
            (item: IItemModified) =>
              item.topicKey === topicKey
          ),
          id,
        };
      }
    );
  });

  const selectedItemIndex = ref<number | null>(null);

  const findIndexOfItem = (index: number): void => {
    selectedItemIndex.value = modifiedItems.value.findIndex(
      (item: IItemModified) => item.itemId === index
    );
  };
  // Methods used in components
  const updateScoreOfItem = (score: number, itemId: number): void => {
    findIndexOfItem(itemId);
    modifiedItems.value[selectedItemIndex.value].score = score;
  };
  const updateCommentOfItem = (comment: string, itemId: number): void => {
    findIndexOfItem(itemId);
    modifiedItems.value[selectedItemIndex.value].comment = comment;
  };
  const changeItemFulfilled = (itemId: number): void => {
    findIndexOfItem(itemId);
    const itemFulfilledState =
      modifiedItems.value[selectedItemIndex.value];
    if (itemFulfilledState) {
      itemFulfilledState.fulfilled = !itemFulfilledState.fulfilled;
      itemFulfilledState.score = null;
    }
  };

  // The below logic is used for computing progress
  const getNumberOfItemsPerTopic = (topicKey: string): number => {
    return modifiedItems.value.reduce((acc, item) => {
      if (item.topicKey === topicKey) {
        acc++;
      }
      return acc;
    }, 0);
  };
  const getNumberOfAnsweredItemsPerTopic = (
    topicKey: string
  ): number => {
    return modifiedItems.value.reduce((acc, item) => {
      if (
        item.topicKey === topicKey &&
        (item.score !== null || item.fulfilled === false)
      ) {
        acc++;
      }
      return acc;
    }, 0);
  };
  const getProgressPercent = (value: number, total: number): number =>
    Number(((value / total) * 100).toFixed(2));

  // Computing progress results rendering
  const totalProgress = computed<IProgress[]>(() => {
    const numberOfTopics = itemTopicKeys.value.length;
    const progress =
      getProgress(numberOfTopics);
    return itemTopicKeys.value.map(
      (topicKey: string, index: number) => {
        const topicTitle = itemTopicTitles.value[topicKey];
        const widthPercentage = progress[index];
        const numberOfItemsPerTopic =
          getNumberOfItemsPerTopic(topicKey);
        const numberOfAnsweredItemsPerTopic =
          getNumberOfAnsweredItemsPerTopic(topicKey);
        const progressPercent = getProgressPercent(
          numberOfAnsweredItemsPerTopic,
          numberOfItemsPerTopic
        );
        return {
          topicKey,
          topicTitle,
          widthPercentage,
          progressPercent,
        };
      }
    );
  });

  const isQuizCompleted = computed<boolean>(() => {
    return totalProgress.value.every(
      (item) => item.progressPercent === 100
    );
  });

  const resetStore = (): void => {
    modifiedItems.value = [];
  };

  return {
    topicHeadingsRefs,
    itemHeadingsRefs,
    setTopicHeadingsRefs,
    setItemHeadingsRefs,
    modifiedItems,
    setCopyOfItems,
    itemTopicKeys,
    itemTopicTitles,
    isItemsTopicExpanded,
    itemsByTopics,
    updateScoreOfItem,
    updateCommentOfItem,
    changeItemFulfilled,
    totalProgress,
    isQuizCompleted,
    resetStore,
  };
});
