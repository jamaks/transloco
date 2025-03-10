import en from '../../../../../../src/assets/i18n/en';
import { DefaultTranspiler, TranslocoService } from '../../public-api';
import { createService, loader, mockLangs, runLoader } from './transloco.mocks';
import { fakeAsync } from '@angular/core/testing';
import { catchError, filter, map, pluck } from 'rxjs/operators';
import { of, timer, throwError } from 'rxjs';
import { DefaultHandler } from '../transloco-missing-handler';
import { DefaultInterceptor } from '../transloco.interceptor';
import { DefaultFallbackStrategy, TranslocoFallbackStrategy } from '../transloco-fallback-strategy';
import Spy = jasmine.Spy;

function createSpy() {
  return jasmine.createSpy();
}

describe('TranslocoService', () => {
  let service: TranslocoService;

  function loadLang(lang = 'en') {
    service.load(lang).subscribe();
    runLoader();
  }

  describe('translate', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should return empty string when the key is falsy', () => {
      expect(service.translate('')).toEqual('');
      expect(service.translate(null)).toEqual(null);
      expect(service.translate(undefined)).toEqual(undefined);
    });

    it('should return empty string when there is no translation file for the active lang', fakeAsync(() => {
      expect(service.translate('home')).toEqual('');
      loadLang();
      expect(service.translate('home')).toEqual(mockLangs['en'].home);
      service.setActiveLang('es');
      expect(service.translate('home')).toEqual('');
    }));

    it('should call missing handler when there is no translation for the key', fakeAsync(() => {
      spyOn((service as any).missingHandler, 'handle').and.callThrough();
      loadLang();
      service.translate('kazaz');
      service.translate('netanel');
      service.translate('itay');
      expect((service as any).missingHandler.handle).toHaveBeenCalledTimes(3);
    }));

    it('should translate', fakeAsync(() => {
      loadLang();
      const eng = mockLangs['en'];
      expect(service.translate('home')).toEqual(eng.home);
      expect(service.translate('alert', { value: 'val' })).toEqual('alert val english');
      expect(service.translate('a.b.c')).toEqual('a.b.c from list english');
      expect(service.translate('key.is.like.path')).toEqual('key is like path');
    }));

    it('should translate using a cb', fakeAsync(() => {
      loadLang();
      const eng = mockLangs['en'];
      expect(service.translate(en => en.home)).toEqual(eng.home);
      expect(service.translate(en => en.a.b.c)).toEqual('a.b.c from list english');
    }));

    it('should translate using a cb with params', fakeAsync(() => {
      loadLang();
      expect(service.translate(en => en.alert, { value: 'val' })).toEqual('alert val english');
    }));

    it('should support multi key translation', fakeAsync(() => {
      loadLang();
      const expected = ['home english', 'a.b.c from list english', 'notexists'];
      expect(service.translate(['home', 'a.b.c', 'notexists'])).toEqual(expected);
    }));

    it('should support multi key translation with dynamic values', fakeAsync(() => {
      loadLang();
      const expected = ['home english', 'alert val english', 'a.b.c from list english'];
      expect(service.translate(['home', 'alert', 'a.b.c'], { value: 'val' })).toEqual(expected);
    }));

    describe('translateValue', () => {
      it('should translate a given value', fakeAsync(() => {
        loadLang();
        const translation = service.transpile(en.home, { value: 'val' });
        expect(translation).toBe('home english');
      }));

      it('should translate a given value with params', fakeAsync(() => {
        loadLang();
        const translation = service.transpile(en.alert, { value: 'val' });
        expect(translation).toBe('alert val english');
      }));
    });

    describe('selectTranslate', () => {
      it('should return an observable with the translation value', fakeAsync(() => {
        const spy = createSpy();
        service.selectTranslate('home').subscribe(spy);
        runLoader();
        expect(spy).toHaveBeenCalledWith('home english');
      }));

      it('should return an observable with the translation value with param', fakeAsync(() => {
        const spy = createSpy();
        service.selectTranslate('alert', { value: 'val' }).subscribe(spy);
        runLoader();
        expect(spy).toHaveBeenCalledWith('alert val english');
      }));
    });

    describe('getTranslation', () => {
      it('should return undefined when no translations loaded', () => {
        expect(service.getTranslation('en')).toBeUndefined();
        expect(service.getTranslation('es')).toBeUndefined();
      });

      it('should return the translation file', fakeAsync(() => {
        loadLang();
        expect(service.getTranslation('en')).toEqual(mockLangs['en']);
      }));

      it('should return the translations map', fakeAsync(() => {
        loadLang();
        loadLang('es');
        const map = service.getTranslation();
        expect(map instanceof Map).toEqual(true);
        expect(map.get('en')).toEqual(mockLangs['en']);
        expect(map.get('es')).toEqual(mockLangs['es']);
      }));
    });

    it('should set the current lang', () => {
      const langSpy = createSpy();
      const newLang = 'es';
      service.langChanges$.subscribe(langSpy);
      service.setActiveLang(newLang);
      expect(langSpy).toHaveBeenCalledWith(newLang);
    });

    describe('setTranslation', () => {
      it('should merge the data', fakeAsync(() => {
        loadLang();
        const translation = { bar: 'bar' };
        service.setTranslation(translation);
        const newTranslation = service.getTranslation('en');

        expect(newTranslation.bar).toEqual('bar');
        expect(newTranslation.home).toEqual('home english');
      }));

      it('should deep merge', fakeAsync(() => {
        loadLang();
        const translation = { a: { bar: 'bar' } };
        service.setTranslation(translation);
        const newTranslation = service.getTranslation('en');
        expect(newTranslation.a.bar).toEqual('bar');
      }));

      it('should replace it', fakeAsync(() => {
        loadLang();
        const translation = { newKey: 'a', newKeyTwo: 'b' };
        service.setTranslation(translation, 'en', { merge: false });
        const newTranslation = service.getTranslation('en');
        expect(newTranslation).toEqual({ newKey: 'a', newKeyTwo: 'b' });
      }));

      it('should add the lang if it not exists', fakeAsync(() => {
        loadLang();
        service.setTranslation({ home: 'home es' }, 'es');
        expect(service.getTranslation('es').home).toEqual('home es');
      }));
    });

    describe('setTranslationKey', () => {
      it('should override key', fakeAsync(() => {
        loadLang();
        service.setTranslationKey('a', 'new value');
        const newTranslation = service.getTranslation('en');
        expect(newTranslation.a).toEqual('new value');
      }));

      it('should deep override key', fakeAsync(() => {
        loadLang();
        service.setTranslationKey('a.b.c', 'new value');
        const newTranslation = service.getTranslation('en');
        expect(newTranslation.a.b.c).toEqual('new value');
      }));

      it('should do nothing if lang not exists', fakeAsync(() => {
        loadLang();
        spyOn((service as any).translations, 'set').and.callThrough();
        service.setTranslationKey('a', 'new value', 'es');
        expect((service as any).translations.set).not.toHaveBeenCalled();
      }));
    });

    describe('load', () => {
      it('should trigger loaded event once loaded', fakeAsync(() => {
        const spy = createSpy();
        service.events$
          .pipe(
            filter(e => e.type === 'translationLoadSuccess'),
            pluck('payload')
          )
          .subscribe(spy);
        loadLang();
        expect(spy).toHaveBeenCalledWith({ lang: 'en' });
      }));

      it('should load the translation using the loader', fakeAsync(() => {
        spyOn((service as any).loader, 'getTranslation').and.callThrough();
        service.load('en').subscribe();
        runLoader();
        expect((service as any).loader.getTranslation).toHaveBeenCalledWith('en');
        expect((service as any).translations.size).toEqual(1);
      }));

      it('should load the translation from cache', fakeAsync(() => {
        loadLang();
        spyOn((service as any).loader, 'getTranslation').and.callThrough();
        service.load('en');
        expect((service as any).loader.getTranslation).not.toHaveBeenCalled();
      }));

      const failLoad = times => {
        let counter = 0;
        return lang => {
          return timer(1000)
            .pipe(map(() => mockLangs[lang]))
            .pipe(
              map(val => {
                if (counter < times) {
                  counter++;
                  throw new Error(`can't load`);
                }
                return val;
              })
            );
        };
      };

      describe('Multiple fallbacks', () => {
        describe('DefaultFallbackStrategy', () => {
          let loader;

          beforeEach(() => {
            loader = {
              getTranslation(lang: string) {
                return timer(1000).pipe(
                  map(() => mockLangs[lang]),
                  map(translation => {
                    if (lang === 'notExists' || lang === 'fallbackNotExists') {
                      throw new Error('error');
                    }
                    return translation;
                  })
                );
              }
            };
          });

          it('should try load the fallbackLang when current lang failed', fakeAsync(() => {
            const service = new TranslocoService(
              loader,
              new DefaultTranspiler(),
              new DefaultHandler(),
              new DefaultInterceptor(),
              { defaultLang: 'en' },
              new DefaultFallbackStrategy({ fallbackLang: 'es', defaultLang: 'en', failedRetries: 2 })
            );

            spyOn(service, 'load').and.callThrough();
            service.load('notExists').subscribe();
            // notExists will try 3 times then the fallback
            runLoader(4);
            expect(service.load).toHaveBeenCalledTimes(2);
            expect((service.load as jasmine.Spy).calls.argsFor(0)).toEqual(['notExists']);
            expect((service.load as jasmine.Spy).calls.argsFor(1)).toEqual(['es']);

            // it should set the fallback lang as active
            expect(service.getActiveLang()).toEqual('es');

            // clear the cache
            expect((service as any).cache.size).toEqual(1);
          }));

          it('should should throw if the fallback lang is failed to load', fakeAsync(() => {
            const service = new TranslocoService(
              loader,
              new DefaultTranspiler(),
              new DefaultHandler(),
              new DefaultInterceptor(),
              { defaultLang: 'en' },
              new DefaultFallbackStrategy({ fallbackLang: 'fallbackNotExists', defaultLang: 'en', failedRetries: 2 })
            );
            spyOn(service, 'load').and.callThrough();
            service
              .load('notExists')
              .pipe(
                catchError(e => {
                  expect(e.message).toEqual('Unable to load translation and all the fallback languages');
                  return of('');
                })
              )
              .subscribe();

            // notExists will try 3 times then the fallback 3 times
            runLoader(6);
            expect(service.load).toHaveBeenCalledTimes(2);
          }));
        });

        describe('CustomFallbackStrategy', () => {
          class StrategyTest implements TranslocoFallbackStrategy {
            getNextLangs(failedLang: string): string[] {
              return ['it', 'gp', 'en'];
            }
          }

          let loader;

          beforeEach(() => {
            loader = {
              getTranslation(lang: string) {
                return timer(1000).pipe(
                  map(() => mockLangs[lang]),
                  map(translation => {
                    if (lang === 'it' || lang === 'gp' || lang === 'notExists') {
                      throw new Error('error');
                    }
                    return translation;
                  })
                );
              }
            };
          });

          it('should try load the it and gp then set en as the active', fakeAsync(() => {
            const service = new TranslocoService(
              loader,
              new DefaultTranspiler(),
              new DefaultHandler(),
              new DefaultInterceptor(),
              { defaultLang: 'es' },
              new StrategyTest()
            );

            spyOn(service, 'load').and.callThrough();
            service.load('notExists').subscribe();
            // 3 notExists/ 3 it / 3 gp / 1 en = 10
            runLoader(10);
            expect((service.load as jasmine.Spy).calls.argsFor(0)).toEqual(['notExists']);
            expect((service.load as jasmine.Spy).calls.argsFor(1)).toEqual(['it']);
            expect((service.load as jasmine.Spy).calls.argsFor(2)).toEqual(['gp']);
            expect((service.load as jasmine.Spy).calls.argsFor(3)).toEqual(['en']);
            expect(service.load).toHaveBeenCalledTimes(4);

            // it should set the fallback lang as active
            expect(service.getActiveLang()).toEqual('en');

            // clear the cache
            expect((service as any).cache.size).toEqual(1);
          }));
        });
      });
    });

    describe('Custom Interceptor', () => {
      it('should support', fakeAsync(() => {
        (service as any).interceptor = {
          preSaveTranslation(translation, lang) {
            return Object.keys(translation).reduce((acc: any, key) => {
              acc[key] = `Intercepted ${key}`;
              return acc;
            }, {});
          },
          preSaveTranslationKey(key, value) {
            return `preSaveTranslationKey ${key}`;
          }
        };
        loadLang();
        runLoader();
        const translation = service.getTranslation('en');
        Object.keys(translation).forEach(key => {
          expect(translation[key]).toEqual(`Intercepted ${key}`);
        });
        service.setTranslationKey('home', 'test');
        expect(service.translate('home')).toEqual('preSaveTranslationKey home');
      }));
    });
  });
});
