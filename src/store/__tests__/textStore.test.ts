import { beforeEach, describe, expect, it } from 'vitest';

import useTextStore from '../textStore';

const resetStore = () => {
  useTextStore.setState({
    searchTerm: '',
    matchDivIndicesByPage: {},
    currentMatchIndex: -1,
    currentPage: 1,
  });
};

beforeEach(() => {
  resetStore();
});

describe('setSearchTerm', () => {
  it('normalizes the input and resets currentMatchIndex', () => {
    useTextStore.setState({ currentMatchIndex: 3 });

    useTextStore.getState().setSearchTerm('\u212B');

    const { searchTerm, currentMatchIndex } = useTextStore.getState();
    expect(searchTerm).toBe('\u00C5');
    expect(currentMatchIndex).toBe(-1);
  });
});

describe('setPageMatches', () => {
  it('preserves the current index when still within the new range', () => {
    useTextStore.getState().setPageMatches(1, [10, 20, 30]);
    useTextStore.setState({ currentMatchIndex: 1 });

    useTextStore.getState().setPageMatches(1, [40, 50, 60]);

    const state = useTextStore.getState();
    expect(state.matchDivIndicesByPage[1]).toEqual([40, 50, 60]);
    expect(state.currentMatchIndex).toBe(1);
  });

  it('resets the index when the match list changes length', () => {
    useTextStore.getState().setPageMatches(1, [1, 2, 3]);
    useTextStore.setState({ currentMatchIndex: 2 });

    useTextStore.getState().setPageMatches(1, [7]);
    expect(useTextStore.getState().currentMatchIndex).toBe(0);

    useTextStore.getState().setPageMatches(1, []);
    expect(useTextStore.getState().currentMatchIndex).toBe(-1);
  });
});

describe('navigation', () => {
  it('wraps around for nextMatch and prevMatch', () => {
    const { setPageMatches, nextMatch, prevMatch } = useTextStore.getState();

    setPageMatches(1, [3, 4, 5]);
    expect(useTextStore.getState().currentMatchIndex).toBe(0);

    nextMatch();
    expect(useTextStore.getState().currentMatchIndex).toBe(1);

    nextMatch();
    expect(useTextStore.getState().currentMatchIndex).toBe(2);

    nextMatch();
    expect(useTextStore.getState().currentMatchIndex).toBe(0);

    prevMatch();
    expect(useTextStore.getState().currentMatchIndex).toBe(2);
  });

  it('does nothing when the active page has no matches', () => {
    const { setPageMatches, nextMatch, prevMatch } = useTextStore.getState();

    setPageMatches(1, []);
    expect(useTextStore.getState().currentMatchIndex).toBe(-1);

    nextMatch();
    expect(useTextStore.getState().currentMatchIndex).toBe(-1);

    prevMatch();
    expect(useTextStore.getState().currentMatchIndex).toBe(-1);
  });
});
