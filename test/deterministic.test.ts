import { assert } from 'chai';
import { Machine, State } from '../src/index';

describe('deterministic machine', () => {
  const pedestrianStates = {
    initial: 'walk',
    states: {
      walk: {
        on: {
          PED_COUNTDOWN: 'wait'
        }
      },
      wait: {
        on: {
          PED_COUNTDOWN: 'stop'
        }
      },
      stop: {}
    }
  };

  const lightMachine = Machine({
    key: 'light',
    initial: 'green',
    states: {
      green: {
        on: {
          TIMER: 'yellow',
          POWER_OUTAGE: 'red'
        }
      },
      yellow: {
        on: {
          TIMER: 'red',
          POWER_OUTAGE: 'red'
        }
      },
      red: {
        on: {
          TIMER: 'green',
          POWER_OUTAGE: 'red'
        },
        ...pedestrianStates
      }
    }
  });

  const testMachine = Machine({
    key: 'test',
    initial: 'a',
    states: {
      a: {
        on: {
          T: 'b.b1',
          F: 'c'
        }
      },
      b: {
        initial: 'b1',
        states: {
          b1: {}
        }
      }
    }
  });

  const deepMachine = Machine({
    key: 'deep',
    initial: 'a',
    states: {
      a1: {
        initial: 'a2',
        states: {
          a2: {
            initial: 'a3',
            states: {
              a3: {
                initial: 'a4',
                states: {
                  a4: {}
                }
              }
            }
          }
        }
      }
    }
  });

  describe('machine.initialState', () => {
    it('should return the initial state', () => {
      assert.equal(lightMachine.initialState, 'green');
    });
  });

  describe('machine.transition()', () => {
    it('should properly transition states based on string event', () => {
      assert.equal(
        (lightMachine.transition('green', 'TIMER') as State).toString(),
        'yellow'
      );
    });

    it('should properly transition states based on event-like object', () => {
      const event = {
        type: 'TIMER'
      };

      assert.equal(
        (lightMachine.transition('green', event) as State).toString(),
        'yellow'
      );
    });

    it('should not transition states for illegal transitions', () => {
      assert.isUndefined(lightMachine.transition('green', 'FAKE'));
    });

    it('should throw an error if not given an event', () => {
      // @ts-ignore
      assert.throws(() => (lightMachine.transition as any)('red', undefined));
    });

    it('should transition to nested states as target', () => {
      assert.equal(
        (testMachine.transition('a', 'T') as State).toString(),
        'b.b1'
      );
    });

    it('should throw an error for transitions from invalid states', () => {
      assert.throws(() => testMachine.transition('fake', 'T'));
    });

    it('should throw an error for transitions to invalid states', () => {
      assert.throws(
        () => testMachine.transition('a', 'F'),
        "Event 'F' on state 'a' leads to undefined state 'c'."
      );
    });

    it('should throw an error for transitions from invalid substates', () => {
      assert.throws(() => testMachine.transition('a.fake', 'T'));
    });
  });

  describe('machine.transition() with nested states', () => {
    it('should properly transition a nested state', () => {
      assert.equal(
        (lightMachine.transition(
          'red.walk',
          'PED_COUNTDOWN'
        ) as State).toString(),
        'red.wait'
      );
    });

    it('should transition from initial nested states', () => {
      assert.equal(
        (lightMachine.transition('red', 'PED_COUNTDOWN') as State).toString(),
        'red.wait'
      );
    });

    it('should transition from deep initial nested states', () => {
      assert.equal(
        (lightMachine.transition('red', 'PED_COUNTDOWN') as State).toString(),
        'red.wait'
      );
    });

    it('should bubble up events that nested states cannot handle', () => {
      assert.equal(
        (lightMachine.transition('red.wait', 'TIMER') as State).toString(),
        'green'
      );

      assert.equal(
        (lightMachine.transition('red', 'TIMER') as State).toString(),
        'green'
      );
    });

    it('should not transition from illegal events', () => {
      assert.isUndefined(lightMachine.transition('red.walk', 'FAKE'));
      assert.isUndefined(deepMachine.transition('a1', 'FAKE'));
    });

    it('should transition to the deepest initial state', () => {
      assert.equal(
        (lightMachine.transition('yellow', 'TIMER') as State).toString(),
        'red.walk'
      );
    });
  });
});