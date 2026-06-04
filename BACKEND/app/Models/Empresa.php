<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Empresa extends Model
{
    use HasFactory;
    protected $connection = 'sqlsrv_db4';
    protected $table = 'empresa';
    protected $primaryKey = 'idEmpresa';

    public $incrementing = false;
    public $timestamps = true;
    protected $dates = ['created_at'];
    protected $casts = [
        'idEmpresa' => 'string',
    ];
}
