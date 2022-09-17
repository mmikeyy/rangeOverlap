import * as R from 'ramda';

export interface Interval {
  debut: string;
  fin: string;
}

export class RangeOverlaps {
  constructor(public top: Interval[] = [], public bottom: Interval[] = []) {
    this.top = R.sortBy(R.prop('debut'), this.top);
    this.bottom = R.sortBy(R.prop('debut'), this.bottom);
  }

  mergeOverlaps(interv: Interval[]) {
    const result = [];
    if (interv.length === 0) {
      return [];
    }
    let last;
    result.push((last = interv.shift()));
    while (interv.length) {
      const item = interv.shift();
      if (item.debut <= last.fin && item.fin > last.fin) {
        last.fin = item.fin;
      } else {
        result.push((last = item));
      }
    }
    return result;
  }

  objToTemps(obj, positif: boolean, type = null) {
    return R.pipe(
      R.map((val) => [
        {
          t: val.debut,
          topCourant: null,
          res: 0,
          val: positif ? 1 : -1,
          estDebut: 1,
          obj: val,
          type,
        },
        {
          t: val.fin,
          topCourant: null,
          res: 0,
          val: positif ? -1 : 1,
          estDebut: 0,
          obj: val,
          type,
        },
      ]),
      R.flatten
    )(obj);
  }

  topMinusBottom() {
    const tempsTop = this.objToTemps(this.top, true, 'top');

    const tempsBottom = this.objToTemps(this.bottom, false, 'bottom');

    let tout = R.pipe(
      R.concat(tempsBottom),
      R.sortWith([
        R.ascend(R.prop('t')),
        R.ascend((obj) => (obj.type === 'bottom' ? 0 : 1)),
        R.ascend(R.prop('estDebut')), // si dispo commence au même momemt qu'une activité se termine,
      ])
    )(tempsTop);
    let res = 0;
    let topCourant = null;
    tout.forEach((val) => {
      if (val.type === 'top') {
        if (val.estDebut) {
          topCourant = val.obj;
        } else {
          topCourant = null;
        }
      }
      res += val.val;
      val.res = res;

      val.topCourant = val.type === 'top' ? val.obj : topCourant;
    });

    const result = new Map();
    let n = 0;
    while (tout.length > 1 && n++ < 1000) {
      tout = R.dropWhile((obj) => obj.res <= 0 || !obj.topCourant, tout);
      if (tout.length === 0) {
        return;
      }

      topCourant = tout[0].topCourant;
      const debut = tout[0].t;
      const periodeProbl = R.takeWhile(
        (obj) =>
          obj.res > 0 &&
          !(
            obj.type === 'top' &&
            obj.topCourant === topCourant &&
            !obj.estDebut
          ),
        tout
      );
      tout = R.slice(periodeProbl.length, Infinity, tout);

      const fin = tout[0].t;
      const resultMaj = result.get(topCourant) || [];
      if (debut !== fin) {
        resultMaj.push([debut, fin]);
        result.set(topCourant, resultMaj);
      }
    }
    if (n >= 1000) {
      console.error('Range overlap - nombre de cycles maximum atteint');
    }
    return R.zip(Array.from(result.keys()), Array.from(result.values()));
  }
}

12;
