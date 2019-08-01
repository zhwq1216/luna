import {AfterViewInit, Component, Input, OnInit} from '@angular/core';
import {Terminal} from 'xterm';
import {NavList} from '../../pages/control/control/control.component';
import {UUIDService} from '../../app.service';
import {CookieService} from 'ngx-cookie-service';
import {TermWS, DataStore} from '../../globals';

const ws = TermWS;

@Component({
  selector: 'elements-ssh-term',
  templateUrl: './ssh-term.component.html',
  styleUrls: ['./ssh-term.component.scss']
})
export class ElementSshTermComponent implements OnInit, AfterViewInit {
  @Input() host: any;
  @Input() userid: any;
  @Input() index: number;
  @Input() token: string;

  term: Terminal;
  secret: string;

  constructor(private _uuid: UUIDService, private _cookie: CookieService) {
  }

  contextMenu($event) {
    console.log('contextMenu');
    this.term.focus();
    if (DataStore.termSelection !== '') {
      ws.emit('data', {'data': DataStore.termSelection, 'room': NavList.List[this.index].room});
      $event.preventDefault();
    }

  }

  ngOnInit() {
    this.secret = this._uuid.gen();
    const fontSize = localStorage.getItem('fontSize') || '14';
    this.term = new Terminal({
      fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
      fontSize: parseInt(fontSize, 10),
      rightClickSelectsWord: true,
      theme: {
        background: '#1f1b1b'
      }
    });
  }

  ngAfterViewInit() {
    this.joinRoom();
  }

  changeWinSize(size: Array<number>) {
    ws.emit('resize', {'cols': size[0], 'rows': size[1]});
  }

  reconnect() {

    if (this.host) {
      if (NavList.List[this.index].connected === true) {
        this.close();
      }
      this.secret = this._uuid.gen();
      ws.emit('host', {
        'uuid': this.host.id,
        'userid': this.userid,
        'secret': this.secret,
        'size': [this.term.cols, this.term.rows]
      });
    }
  }

  joinRoom() {
    NavList.List[this.index].Term = this.term;
    NavList.List[this.index].termComp = this;
    console.log(this.term);
    console.log('Col: ', this.term.cols, 'rows', this.term.rows);
    if (this.host) {
      ws.emit('host', {
        'uuid': this.host.id,
        'userid': this.userid,
        'secret': this.secret,
        'size': [this.term.cols, this.term.rows]
      });
    }
    if (this.token) {
      ws.emit('token', {
        'token': this.token, 'secret': this.secret,
        'size': [this.term.cols, this.term.rows]
      });
    }
    const that = this;
    this.term.on('selection', function () {
      document.execCommand('copy');
      DataStore.termSelection = this.getSelection();
    });

    this.term.on('data', function (data) {
      ws.emit('data', {'data': data, 'room': NavList.List[that.index].room});
    });

    ws.on('data', data => {
      const view = NavList.List[that.index];
      if (view && data['room'] === view.room) {
        that.term.write(data['data']);
      }
    });

    ws.on('disconnect', () => {
      that.close();
    });

    ws.on('logout', (data) => {
      if (data['room'] === NavList.List[that.index].room) {
        NavList.List[that.index].connected = false;
      }
    });

    ws.on('room', data => {
      if (data['secret'] === this.secret) {
        NavList.List[that.index].room = data['room'];
        NavList.List[this.index].connected = true;
      }
    });
  }

  close() {
    const view = NavList.List[this.index];
    if (view) {
      NavList.List[this.index].connected = false;
      ws.emit('logout', NavList.List[this.index].room);
    }
  }

  active() {
    this.term.focus();
  }
}
