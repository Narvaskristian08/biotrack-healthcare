import 'package:http/http.dart' as http;

class TimeoutHttpClient extends http.BaseClient {
  TimeoutHttpClient(this._inner, this._timeout);

  final http.Client _inner;
  final Duration _timeout;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    return _inner
        .send(request)
        .timeout(
          _timeout,
          onTimeout: () {
            throw http.ClientException(
              'Request timed out after ${_timeout.inMilliseconds}ms',
              request.url,
            );
          },
        );
  }

  @override
  void close() {
    _inner.close();
  }
}
