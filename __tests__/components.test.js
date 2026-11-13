import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Input } from '../src/components/Input';
import { SplitPreview } from '../src/components/SplitPreview';
import { Icon } from '../src/components/Icon';

describe('Step 4 UI Components', () => {
  test('Button renders with title and variants', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<Button title="Submit" variant="primary" />);
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  test('Card renders with child elements', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Card>
          <Button title="Inside Card" />
        </Card>
      );
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  test('Input renders with label and prefix', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Input label="Expense Amount" prefix="₹" placeholder="0.00" value="500" onChangeText={() => {}} />
      );
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  test('SplitPreview renders for family trip', () => {
    const splits = [
      { familyId: 'f1', sharePaise: 250000, weightUsed: 200 },
      { familyId: 'f2', sharePaise: 150000, weightUsed: 100 },
    ];
    const familyNames = { f1: 'Sharma Family', f2: 'Verma Family' };

    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <SplitPreview splits={splits} familyNames={familyNames} isFriendsTrip={false} />
      );
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  test('SplitPreview renders for friends trip', () => {
    const splits = [
      { familyId: 'p1', sharePaise: 100000 },
      { familyId: 'p2', sharePaise: 100000 },
    ];
    const familyNames = { p1: 'Rahul', p2: 'Amit' };

    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <SplitPreview splits={splits} familyNames={familyNames} isFriendsTrip={true} />
      );
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  test('Icon renders SVG icons properly', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<Icon name="card" size={24} color="#10B981" />);
    });
    expect(tree.toJSON()).toBeTruthy();

    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<Icon name="users" size={20} />);
    });
    expect(tree.toJSON()).toBeTruthy();

    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<Icon name="trash" size={16} />);
    });
    expect(tree.toJSON()).toBeTruthy();
  });
});
