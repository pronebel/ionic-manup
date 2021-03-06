import { error } from 'util';
import { Observable } from 'rxjs/Rx';
import { AlertType, ManUpService } from './manup.service';
import { ManUpConfig} from './manup.config';

import 'rxjs/add/observable/of';

class MockAppVersion {
    public static getVersionNumber() {
        return Promise.resolve("2.3.4");
    }
}

describe('Manup Spec', function() {

    describe('evaluate', function() {
        it('Should return maintenance mode if json says disabled', function(done) {
            let json = {
                minimum: "2.3.4",
                latest: "2.3.4",
                url: "http://example.com",
                enabled: false
            };

            let manup = new ManUpService(null, null, null, null, null,null);
            manup.AppVersion = MockAppVersion;

            manup.evaluate(json).then(function(alert) {
                expect(alert).toEqual(AlertType.MAINTENANCE);
                done();
            });
        });
        it('Should return mandatory update if app version less than minimum', function(done) {
            let json = {
                minimum: "4.3.4",
                latest: "6.3.4",
                url: "http://example.com",
                enabled: true 
            };

            let manup = new ManUpService(null, null, null, null, null,null);
            manup.AppVersion = MockAppVersion;

            manup.evaluate(json).then(function(alert) {
                expect(alert).toEqual(AlertType.MANDATORY);
                done();
            });
        });
        it('Should return optional update if app version less than latest', function(done) {
            let json = {
                minimum: "2.3.4",
                latest: "6.3.4",
                url: "http://example.com",
                enabled: true 
            };

            let manup = new ManUpService(null, null, null, null, null,null);
            manup.AppVersion = MockAppVersion;

            manup.evaluate(json).then(function(alert) {
                expect(alert).toEqual(AlertType.OPTIONAL);
                done();
            });
        });
        it('Should return nop if app version latest', function(done) {
            let json = {
                minimum: "2.3.4",
                latest: "2.3.4",
                url: "http://example.com",
                enabled: true 
            };

            let manup = new ManUpService(null, null, null, null, null,null);
            manup.AppVersion = MockAppVersion;

            manup.evaluate(json).then(function(alert) {
                expect(alert).toEqual(AlertType.NOP);
                done();
            });
        });
    });

    describe('metadata', function() {

        let config: ManUpConfig = {
            url: 'test.example.com'
        }
        
        describe('Http route, no storage configured', () => {
            let mockHttp = {
                get: function(url: string):Observable<Object> {
                    return Observable.of({
                        json: function(): Object {
                            return {
                                ios: {
                                    minimum: "1.0.0",
                                    latest: "2.4.5",
                                    enabled: true,
                                    url: "http://http.example.com" 
                                }
                            }
                        }
                    });
                }
            };
            it('Should make an http request', function(done) {
                spyOn(mockHttp, 'get').and.callThrough();
                let manup = new ManUpService(config, <any> mockHttp, null, null, null,null);
                manup.metadata().subscribe(data => {
                    expect(mockHttp.get).toHaveBeenCalled();
                    done();
                })
            })
            it('Should return json', function(done) {
                let manup = new ManUpService(config, <any> mockHttp, null, null, null,null);
                manup.metadata().subscribe(data => {
                    expect(data.ios).toBeDefined();
                    expect(data.ios.url).toBe('http://http.example.com');
                    done();
                })
            })
        });

        describe('Http route, with storage', () => {
            let mockHttp = {
                get: function(url: string):Observable<Object> {
                    return Observable.of({
                        json: function(): Object {
                            return {
                                ios: {
                                    minimum: "1.0.0",
                                    latest: "2.4.5",
                                    enabled: true,
                                    url: "http://http.example.com" 
                                }
                            }
                        }
                    });
                }
            };
            let mockStorage = {
                set(key: string, value: string) { 
                    return Promise.resolve();
                }
            }
            let response: any;
            let manup: any;

            beforeAll( done => {
                manup = new ManUpService(config, <any> mockHttp, null, null, null, <any> mockStorage);
                spyOn(mockHttp, 'get').and.callThrough();
                spyOn(manup, 'saveMetadata').and.callThrough();
                manup.metadata().subscribe( (data:any) => {
                    response = data;
                    done();
                });
            })
            it('Should make an http request', () => {
                expect(mockHttp.get).toHaveBeenCalled();
            })
            it('Should store the result to storage', () => {
                expect(manup.saveMetadata).toHaveBeenCalled();
            })
            it('Should return json', () => {
                expect(response.ios).toBeDefined();
                expect(response.ios.url).toBe('http://http.example.com');
            })
        });

        describe('Fallback to storage', () => {
            let mockHttp: any;
            let mockStorage: any;

            beforeEach( () => {
                mockHttp = {
                    get: function(url: string):Observable<Object> {
                        return Observable.throw(new Error('HTTP Failed'));
                    }
                };
                mockStorage = {
                    get(key: string) {
                        return Promise.resolve(JSON.stringify({
                            ios: {
                                minimum: "1.0.0",
                                latest: "2.4.5",
                                enabled: true,
                                url: "http://storage.example.com" 
                            }
                        }));
                    },
                    set(key: string, value: string) { 
                        return Promise.resolve();
                    }
                }
                spyOn(mockHttp, 'get').and.callThrough();
                spyOn(mockStorage, 'get').and.callThrough();
                spyOn(mockStorage, 'set').and.callThrough();
            })

            it('Should make an http request', function(done) {
                let manup = new ManUpService(config, <any> mockHttp, null, null, null, <any> mockStorage);
                manup.metadata().subscribe(data => {
                    expect(mockHttp.get).toHaveBeenCalled();
                    done();
                })
            })
            it('Should fallback to storage', function(done) {
                let manup = new ManUpService(config, <any> mockHttp, null, null, null, <any> mockStorage);
                manup.metadata().subscribe(data => {
                    expect(mockStorage.get).toHaveBeenCalled();
                    done();
                })
            })
            it('Should return json', function(done) {
                let manup = new ManUpService(config, <any> mockHttp, null, null, null, <any> mockStorage);
                manup.metadata().subscribe(data => {
                    expect(data.ios).toBeDefined();
                    expect(data.ios.url).toBe('http://storage.example.com');
                    done();
                })
            })
        });
        
    })

    describe('metadataFromStorage', function() {

        it('Should return data from storage, if it exists', done => {
            let metadata = {ios: {minimum: '1.0.0', latest: '2.0.0', enabled: true, url: 'test.example.com'}};
            let mockStorage = {
                get(key: string) {
                    return Promise.resolve(JSON.stringify(metadata));
                }
            }
            spyOn(mockStorage, 'get').and.callThrough();
            let manup = new ManUpService(null, null, null, null, null, <any> mockStorage);
            manup.metadataFromStorage()
            .subscribe( (data) => {
                expect(mockStorage.get).toHaveBeenCalledWith('com.nextfaze.ionic-manup.manup');
                expect(data).toEqual(metadata);
                done();
            })
        })

        it('Should error if data is not stored ', function(done) {
            let mockStorage = {
                get(key: string) {
                    return Promise.reject(new Error('not found'));
                }
            }
            spyOn(mockStorage, 'get').and.callThrough();
            let manup = new ManUpService(null, null, null, null, null, <any> mockStorage);
            manup.metadataFromStorage()
            .subscribe( 
                data => {
                    expect(data).toBe(false);
                },
                error => {
                    expect(error).toBeDefined();
                    done();
                }
            )
        })
        it('Should throw an exception if storage not configured', done => {
            let manup = new ManUpService(null, null, null, null, null, null);
            expect(() => {manup.metadataFromStorage()}).toThrowError();
            done();
        })
    });

    describe('saveMetaData', function() {
        let mockStorage = {
            set(key: string, value: string) {
                return Promise.resolve();
            }
        }

        it('Should save the item if storage configured', done => {
            spyOn(mockStorage, 'set').and.callThrough();
            let manup = new ManUpService(null, null, null, null, null, <any> mockStorage);
            let metadata = {ios: {minimum: '1.0.0', latest: '2.0.0', enabled: true, url: 'test.example.com'}};
            manup.saveMetadata(metadata)
            .then( () => {
                expect(mockStorage.set).toHaveBeenCalledWith('com.nextfaze.ionic-manup.manup', JSON.stringify(metadata))
                done();
            })
        });

        it('Should throw an exception if storage not configured', done => {
            let metadata = {ios: {minimum: '1.0.0', latest: '2.0.0', enabled: true, url: 'test.example.com'}};
            let manup = new ManUpService(null, null, null, null, null, null);
            expect(() => {manup.saveMetadata(metadata)}).toThrowError();
            done();
        })
    })

    describe('getPlatformData', function() {
        let json = {
            ios: {
                minimum: "1.0.0",
                latest: "2.4.5",
                enabled: true,
                url: "http://example.com" 
            },
            android: {
                minimum: "4.0.1",
                latest: "6.2.1",
                enabled: true,
                url: "http://example.com" 
            },
            windows: {
                minimum: "1.0.0",
                latest: "1.0.1",
                enabled: false,
                url: "http://example.com" 
            },
        }

        it('should return IOS metadata if platform is ios', function() {
            let mockPlatform = {
                is: function(v: String) {
                    return v === 'ios'
                }
            };
            let manup = new ManUpService(null, null, null, <any> mockPlatform, null,null);

            let result = manup.getPlatformData(json);
            expect(result).toEqual(json.ios);
        })

        it('should return android metadata if platform is android', function() {
            let mockPlatform = {
                is: function(v: String) {
                    return v === 'android'
                }
            };
            let manup = new ManUpService(null, null, null, <any> mockPlatform, null,null);

            let result = manup.getPlatformData(json);
            expect(result).toEqual(json.android);
        })

        it('should return windows metadata if platform is windows', function() {
            let mockPlatform = {
                is: function(v: String) {
                    return v === 'windows'
                }
            };
            let manup = new ManUpService(null, null, null, <any> mockPlatform, null,null);

            let result = manup.getPlatformData(json);
            expect(result).toEqual(json.windows);
        })

        it('should throw and error if the platform is unsupported', function() {
            let mockPlatform = {
                is: function(v: String) {
                    return false;
                }
            };
            let manup = new ManUpService(null, null, null, <any> mockPlatform, null,null);

            expect( () => {manup.getPlatformData(json)}).toThrow();
        })

    })

})
