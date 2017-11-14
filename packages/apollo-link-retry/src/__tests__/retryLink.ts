import gql from 'graphql-tag';
import { execute, ApolloLink, Observable, FetchResult } from 'apollo-link';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';

import { RetryLink } from '../retryLink';

const query = gql`
  {
    sample {
      id
    }
  }
`;

describe('RetryLink', () => {
  it('should fail with unreachable endpoint', done => {
    const max = 10;
    const retry = new RetryLink({ delay: 1, max });
    const error = new Error('I never work');
    const stub = jest.fn(() => {
      return new Observable(observer => observer.error(error));
    });

    const link = ApolloLink.from([retry, stub]);

    execute(link, { query }).subscribe(
      () => {
        throw new Error();
      },
      actualError => {
        expect(stub).toHaveBeenCalledTimes(max);
        expect(error).toEqual(actualError);
        done();
      },
      () => {
        throw new Error();
      },
    );
  });

  it('should return data from the underlying link on a successful operation', done => {
    const retry = new RetryLink();
    const data = <FetchResult>{
      data: {
        hello: 'world',
      },
    };
    const stub = jest.fn();
    stub.mockReturnValue(of(data));

    const link = ApolloLink.from([retry, stub]);

    execute(link, { query }).subscribe(
      actualData => {
        expect(stub).toHaveBeenCalledTimes(1);
        expect(data).toEqual(actualData);
      },
      () => {
        throw new Error();
      },
      done,
    );
  });

  it('should return data from the underlying link on a successful retry', done => {
    const retry = new RetryLink({ delay: 1, max: 2 });
    const error = new Error('I never work 2');
    const data = <FetchResult>{
      data: {
        hello: 'world 2',
      },
    };
    const stub = jest.fn();
    stub.mockReturnValueOnce(_throw(error));
    stub.mockReturnValueOnce(of(data));

    const link = ApolloLink.from([retry, stub]);

    execute(link, { query }).subscribe(
      actualData => {
        expect(stub).toHaveBeenCalledTimes(2);
        expect(data).toEqual(actualData);
      },
      e => {
        console.log('calls', stub.mock.calls);
        console.log('e', e);
        throw new Error();
      },
      done,
    );
  });
});
