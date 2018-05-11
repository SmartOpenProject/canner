// @flow
import {Map, List} from 'immutable';
import type {Action, ActionType} from './types';
import produce from 'immer';
import {merge, findIndex, remove} from 'lodash';

export function withTypename(value: any): any {
  if (Map.isMap(value)) {
    value = value.update('__typename', typename => typename || null);
    return value.map(withTypename);
  }
  if (List.isList(value)) {
    return value.map(withTypename);
  }

  return value;
}

export function mutatePure(originValue: Object, action: Action<ActionType>): any {
  let {key, id, value, path} = action.payload;
  // $FlowFixMe
  return produce(originValue, draft => {
    switch (action.type) {
      case 'CREATE_ARRAY': {
        value = value.toJS();
        draft[key].push(value);
        break;
      }
      case 'UPDATE_ARRAY': {
        value = withTypename(value).toJS;
        draft[key] = draft[key].map(item => {
          return item.id === id ?
            merge(item, value) :
            item
        });
        break;
      }
      
      case 'DELETE_ARRAY': {
        draft[key] = draft[key].filter(item => item.id !== id);
        break;
      }

      case 'UPDATE_OBJECT': {
        value = withTypename(value).toJS();
        merge(draft[key], value);
        break;
      }

      case 'CONNECT': {
        value = value.toJS();
        const index = findIndex(draft[key] || [], item => item.id === id);
        draft[key][index][path].push(value);
        break;
      }

      case 'DISCONNECT': {
        const index = findIndex(draft[key] || [], item => item.id === id);
        remove(draft[key][index][path], item => item.id === id);
        break;
      }

      case 'CREATE_AND_CONNECT': {
        const index = findIndex(draft[key] || [], item => item.id === id);
        draft[key][index][path].push(value);
        break;
      }

      case 'DISCONNECT_AND_DELETE': {
        const index = findIndex(draft[key] || [], item => item.id === id);
        remove(draft[key][index][path], item => item.id === id);
        break;
      }

      case 'NOOP':
      default:
        break;
    }
  });
}

export default function mutate(originValue: Map<string, *>, action: Action<ActionType>): any {
  let {key, id, value, path} = action.payload;
  switch (action.type) {
    case 'CREATE_ARRAY': {
      return originValue.update(key, list => list.push(value));
    }
    case 'UPDATE_ARRAY': {
      value = withTypename(value);
      return originValue.update(key, list => list.map(item => item.get('id') === id ? item.merge(value): item));
    }
    
    case 'DELETE_ARRAY': {
      return originValue.update(key, list => list.filter(item => item.get('id') !== id));
    }

    case 'UPDATE_OBJECT': {
      value = withTypename(value);
      return originValue.update(key, map => map.merge(value));
    }

    case 'CONNECT': {
      const index = (originValue.get(key) || new List()).findIndex(item => item.get('id') === id);
      return originValue.updateIn([key, index, path], list => list.push(value));
    }

    case 'DISCONNECT': {
      const index = (originValue.get(key) || new List()).findIndex(item => item.get('id') === id);
      return originValue.updateIn([key, index, path], list => list.filter(item => item.get('id') !== value.get('id')));
    }

    case 'CREATE_AND_CONNECT': {
      const index = (originValue.get(key) || new List()).findIndex(item => item.get('id') === id);
      return originValue.updateIn([key, index, path], list => list.push(value));
    }

    case 'DISCONNECT_AND_DELETE': {
      const index = (originValue.get(key) || new List()).findIndex(item => item.get('id') === id);
      return originValue.updateIn([key, index, path], list => list.filter(item => item.get('id') !== value.get('id')));
    }

    case 'NOOP':
    default:
      return originValue;
  }
}